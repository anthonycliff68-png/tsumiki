// Compose a release card: a numbered 4:5 slide for a feed carousel.
//
// Two layouts, both driven by a plain text spec so the next release is an edit
// to a .txt rather than a patch to a renderer.
//
//   title   — wordmark, giant version number, headline, numbered rows
//   screens — wordmark, pill, headline, two phones, a caption under each
//
// Spec format. First line picks the layout; sections split on a line of "--".
//
//   title                              screens
//   Tsumiki                            Tsumiki
//   1                     <- badge     2
//   WHAT'S NEW IN         <- label     v 1.2          <- pill
//   1.2                   <- number    Two reasons    <- headline, 1 per line
//   Headline line one     <- headline  to update.        (last line accents)
//   Headline line two
//   --                                 --
//   01|Title|Subtitle                  01|Title|Subtitle
//   02|Title|Subtitle                  02|Title|Subtitle
//   --                                 --
//   Available now on the App Store     Available now on the App Store
//
// Usage:
//   swift scripts/flyer.swift <spec.txt> <out.png> [shotA.png shotB.png]

import AppKit
import Foundation

let args = CommandLine.arguments
guard args.count >= 3 else {
    FileHandle.standardError.write(
        "usage: flyer.swift <spec.txt> <out.png> [left.png right.png]\n".data(using: .utf8)!)
    exit(2)
}
let W = 1080, H = 1350

guard let raw = try? String(contentsOfFile: args[1], encoding: .utf8) else {
    FileHandle.standardError.write("could not read \(args[1])\n".data(using: .utf8)!)
    exit(1)
}
let blocks = raw.components(separatedBy: "\n--\n")
    .map { $0.split(separator: "\n").map(String.init).filter { !$0.isEmpty } }
guard blocks.count >= 3, let head = blocks.first, head.count >= 4 else {
    FileHandle.standardError.write("spec needs 3 sections and a 4-line head\n".data(using: .utf8)!)
    exit(1)
}
let layout = head[0]
let wordmark = head[1], badge = head[2], lede = head[3]
let headline = Array(head.dropFirst(4))
let rows = blocks[1].map { $0.components(separatedBy: "|") }
let footer = blocks[2].first ?? ""

// --- fonts -----------------------------------------------------------------

for f in ["ArchivoCondensed-Black", "DMSans-Bold", "DMSans-Medium", "DMSans-Regular"] {
    CTFontManagerRegisterFontsForURL(
        URL(fileURLWithPath: "assets/fonts/\(f).ttf") as CFURL, .process, nil)
}
func face(_ n: String, _ s: CGFloat, _ w: NSFont.Weight = .regular) -> NSFont {
    NSFont(name: n, size: s) ?? NSFont.systemFont(ofSize: s, weight: w)
}
let display = { (s: CGFloat) in face("Archivo Condensed Black", s, .black) }
let bold = { (s: CGFloat) in face("DMSans-Bold", s, .bold) }
let body = { (s: CGFloat) in face("DMSans-Regular", s) }

// --- palette ---------------------------------------------------------------

func hex(_ s: String) -> NSColor {
    var v: UInt64 = 0
    Scanner(string: s).scanHexInt64(&v)
    return NSColor(red: CGFloat((v >> 16) & 0xff) / 255, green: CGFloat((v >> 8) & 0xff) / 255,
                   blue: CGFloat(v & 0xff) / 255, alpha: 1)
}
let bg = hex("0B0B0C"), text = hex("F4F1EC"), muted = hex("BDB7AD")
let accent = hex("E8552B")                    // the app's orange
let rule = NSColor.white.withAlphaComponent(0.12)

// --- canvas ----------------------------------------------------------------

guard let ctx = CGContext(data: nil, width: W, height: H, bitsPerComponent: 8, bytesPerRow: 0,
                          space: CGColorSpaceCreateDeviceRGB(),
                          bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue) else { exit(1) }
ctx.setFillColor(bg.cgColor)
ctx.fill(CGRect(x: 0, y: 0, width: W, height: H))

// One broad glow behind the upper middle, where the version number sits, so
// the biggest element on the card is lit rather than floating on flat black.
func glow(_ cx: CGFloat, _ cy: CGFloat, _ r: CGFloat, _ a: CGFloat) {
    let cols = [accent.withAlphaComponent(a).cgColor,
                accent.withAlphaComponent(0).cgColor] as CFArray
    guard let g = CGGradient(colorsSpace: CGColorSpaceCreateDeviceRGB(), colors: cols,
                             locations: [0, 1]) else { return }
    ctx.drawRadialGradient(g, startCenter: CGPoint(x: cx, y: cy), startRadius: 0,
                           endCenter: CGPoint(x: cx, y: cy), endRadius: r,
                           options: .drawsAfterEndLocation)
}
glow(CGFloat(W) * 0.42, CGFloat(H) * 0.62, 700, 0.30)
glow(CGFloat(W) * 0.90, CGFloat(H) * 0.14, 420, 0.14)

NSGraphicsContext.current = NSGraphicsContext(cgContext: ctx, flipped: false)

/// y measured from the top, which is how the layout is actually reasoned about.
func top(_ y: CGFloat) -> CGFloat { CGFloat(H) - y }

@discardableResult
func draw(_ s: String, _ f: NSFont, _ c: NSColor, x: CGFloat, y: CGFloat,
          track: CGFloat = 0) -> CGFloat {
    var a: [NSAttributedString.Key: Any] = [.font: f, .foregroundColor: c]
    if track != 0 { a[.kern] = track }
    let str = NSAttributedString(string: s, attributes: a)
    str.draw(at: CGPoint(x: x, y: top(y) - f.ascender))
    return str.size().width
}
/// Text that wraps inside a column. Without this a caption runs straight
/// through the one beside it and the card ships with two sentences on top of
/// each other.
@discardableResult
func drawWrapped(_ s: String, _ f: NSFont, _ c: NSColor, x: CGFloat, y: CGFloat,
                 width: CGFloat, leading: CGFloat) -> CGFloat {
    let para = NSMutableParagraphStyle()
    para.lineBreakMode = .byWordWrapping
    para.maximumLineHeight = leading
    para.minimumLineHeight = leading
    let a = NSAttributedString(string: s, attributes: [
        .font: f, .foregroundColor: c, .paragraphStyle: para,
    ])
    // Measured, then drawn into exactly the box it needs, and the height is
    // handed back. Drawing into a fixed three-line box and hoping was how a
    // two-line title kept landing on top of the caption underneath it.
    let lines = max(1, Int(ceil(a.boundingRect(
        with: CGSize(width: width, height: .greatestFiniteMagnitude),
        options: [.usesLineFragmentOrigin, .usesFontLeading]).height / leading)))
    let height = CGFloat(lines) * leading
    a.draw(in: CGRect(x: x, y: top(y) - height, width: width, height: height))
    return height
}

func line(_ y: CGFloat, from: CGFloat, to: CGFloat) {
    ctx.setFillColor(rule.cgColor)
    ctx.fill(CGRect(x: from, y: top(y), width: to - from, height: 1.5))
}

let M: CGFloat = 88

// --- header, shared --------------------------------------------------------

draw(wordmark.uppercased(), bold(20), text, x: M, y: 92, track: 8)

// The page number, so a carousel reads as a sequence rather than a pile.
let br: CGFloat = 27
ctx.setFillColor(accent.cgColor)
ctx.fillEllipse(in: CGRect(x: CGFloat(W) - M - br * 2, y: top(104), width: br * 2, height: br * 2))
let bw = NSAttributedString(string: badge, attributes: [.font: bold(22), .foregroundColor: text])
    .size().width
draw(badge, bold(22), text, x: CGFloat(W) - M - br - bw / 2, y: 63)

// --- layouts ---------------------------------------------------------------

if layout == "list" {
    // No giant number on this one. It is the card people actually read, and a
    // 250pt "1.2" above the list would take the room six lines need.
    draw(lede.uppercased(), bold(18), accent, x: M, y: 168, track: 7)
    var y: CGFloat = 236
    for l in headline {
        draw(l, display(76), text, x: M, y: y, track: -2)
        y += 82
    }
    y += 34
    line(y, from: M, to: CGFloat(W) - M)
    y += 44
    for r in rows where r.count >= 3 {
        draw(r[0], bold(22), accent, x: M, y: y + 3)
        let tH = drawWrapped(r[1], bold(27), text, x: M + 84, y: y,
                             width: CGFloat(W) - M * 2 - 84, leading: 34)
        let sH = drawWrapped(r[2], body(21), muted, x: M + 84, y: y + tH + 6,
                             width: CGFloat(W) - M * 2 - 84, leading: 27)
        y += tH + sH + 20
        line(y, from: M, to: CGFloat(W) - M)
        y += 34
    }
} else if layout == "title" {
    draw(lede.uppercased(), bold(18), accent, x: M, y: 168, track: 7)

    // The version number is the whole point of the card: set it as large as
    // the margins allow and let everything else be small next to it. For this
    // layout the first headline line is the number; the rest is the sentence.
    draw(headline.first ?? "", display(250), text, x: M - 10, y: 300, track: -6)

    // A thin bar on the right edge, the one piece of pure geometry on the card.
    ctx.setFillColor(accent.cgColor)
    ctx.fill(CGRect(x: CGFloat(W) - M - 6, y: top(560), width: 6, height: 280))

    var y: CGFloat = 600
    for l in headline.dropFirst() {
        draw(l, bold(42), text, x: M, y: y, track: -0.8)
        y += 54
    }

    y += 26
    line(y, from: M, to: CGFloat(W) - M)
    y += 52
    for r in rows where r.count >= 3 {
        draw(r[0], bold(26), accent, x: M, y: y + 4)
        draw(r[1], bold(30), text, x: M + 108, y: y, track: -0.4)
        drawWrapped(r[2], body(23), muted, x: M + 108, y: y + 42,
                    width: CGFloat(W) - M * 2 - 108, leading: 30)
        y += 94
        line(y, from: M, to: CGFloat(W) - M)
        y += 52
    }
} else {
    // A pill, so the version reads as a tag rather than a heading.
    let pw = NSAttributedString(string: lede, attributes: [.font: bold(24)]).size().width
    ctx.setFillColor(accent.withAlphaComponent(0.20).cgColor)
    let pill = CGPath(roundedRect: CGRect(x: M, y: top(206), width: pw + 56, height: 60),
                      cornerWidth: 30, cornerHeight: 30, transform: nil)
    ctx.addPath(pill); ctx.fillPath()
    draw(lede, bold(24), accent, x: M + 28, y: 162)

    var y: CGFloat = 268
    for (i, l) in headline.enumerated() {
        draw(l, display(78), i == headline.count - 1 ? accent : text, x: M, y: y, track: -2)
        y += 84
    }

    // Two phones, level with each other: this card is a comparison, and
    // staggering them would imply an order that is not there.
    func phone(_ path: String, x: CGFloat, y yTop: CGFloat, scale: CGFloat) {
        guard let img = NSImage(contentsOfFile: path),
              let cg = img.cgImage(forProposedRect: nil, context: nil, hints: nil) else { return }
        let w = CGFloat(cg.width) * scale, h = CGFloat(cg.height) * scale
        let rect = CGRect(x: x, y: top(yTop) - h, width: w, height: h)
        let p = CGPath(roundedRect: rect, cornerWidth: 34, cornerHeight: 34, transform: nil)
        ctx.saveGState()
        ctx.setShadow(offset: CGSize(width: 0, height: -12), blur: 40,
                      color: NSColor.black.withAlphaComponent(0.7).cgColor)
        ctx.addPath(p); ctx.setFillColor(bg.cgColor); ctx.fillPath()
        ctx.restoreGState()
        ctx.saveGState(); ctx.addPath(p); ctx.clip(); ctx.draw(cg, in: rect); ctx.restoreGState()
        ctx.saveGState(); ctx.addPath(p)
        ctx.setStrokeColor(NSColor.white.withAlphaComponent(0.14).cgColor)
        ctx.setLineWidth(2); ctx.strokePath(); ctx.restoreGState()
    }

    // Sized by the height left over, not by the width available. A phone
    // screenshot is 1320x2868: half the card's width makes it 1038pt tall,
    // which runs off the bottom and takes the captions with it.
    let gap: CGFloat = 40
    let shotTop: CGFloat = 440
    let shotH: CGFloat = 556
    let scale = shotH / 2868
    let pw2 = 1320 * scale
    let x0 = (CGFloat(W) - pw2 * 2 - gap) / 2
    if args.count >= 5 {
        phone(args[3], x: x0, y: shotTop, scale: scale)
        phone(args[4], x: x0 + pw2 + gap, y: shotTop, scale: scale)
    }

    let cy = shotTop + shotH + 56
    for (i, r) in rows.enumerated() where r.count >= 3 {
        let x = i == 0 ? x0 : x0 + pw2 + gap
        draw(r[0], bold(22), accent, x: x, y: cy)
        // Wrapped, not drawn flat: a two-word title is the intent, but a
        // longer one must fold inside its column rather than run through the
        // caption beside it.
        let titleH = drawWrapped(r[1], display(44), text, x: x, y: cy + 38,
                                 width: pw2, leading: 48)
        drawWrapped(r[2], body(21), muted, x: x, y: cy + 38 + titleH + 14,
                    width: pw2, leading: 29)
    }
}

// --- footer ----------------------------------------------------------------

ctx.setFillColor(accent.cgColor)
ctx.fillEllipse(in: CGRect(x: M, y: top(CGFloat(H) - 82), width: 11, height: 11))
draw(footer, body(24), text, x: M + 28, y: CGFloat(H) - 76)

NSGraphicsContext.current = nil
guard let image = ctx.makeImage(),
      let png = NSBitmapImageRep(cgImage: image).representation(using: .png, properties: [:])
else { exit(1) }
try png.write(to: URL(fileURLWithPath: args[2]))
print("✓ \(args[2])")
