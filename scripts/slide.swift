// Compose an app screenshot into a 1080x1920 slide.
//
// A phone screenshot is 1320x2868 — taller and narrower than the 9:16 that
// TikTok, Reels and Shorts want. Posting one raw gets it letterboxed with grey
// bars, or cropped, and cropping an app screenshot takes the dock off the
// bottom, which is the part worth showing.
//
// So: the screen sits on a ground tinted with its own bleed colour, sampled
// from the screenshot itself, so every slide matches the screen it is of
// without anyone picking a colour by hand.
//
// No caption is drawn. Slideshow text gets added in the app that posts it,
// where it can be timed and animated; baking it in just makes it unchangeable.
//
// Usage:
//   swift scripts/slide.swift <shot.png> <out.png> [width] [height]
//   swift scripts/slide.swift <shot.png> <out.png> --cutout [width] [height]
//
// --cutout drops the ground and the glow and leaves the rounded screen alone
// on transparency, for dropping onto a background chosen somewhere else. With
// no size it is cropped tight to the device; with one it is centred on a
// transparent canvas of that size, so it lands already aligned.

import AppKit
import Foundation

let args = CommandLine.arguments
guard args.count >= 3 else {
    FileHandle.standardError.write("usage: slide.swift <shot.png> <out.png> [w] [h]\n".data(using: .utf8)!)
    exit(2)
}
let cutout = args.contains("--cutout")
let sizes = args.dropFirst(3).filter { $0 != "--cutout" }.compactMap { Int($0) }
// A tight cutout takes its size from the screenshot; everything else defaults
// to the 9:16 the phone feeds want.
let wantsSize = sizes.count >= 2 || !cutout

guard let shot0 = NSImage(contentsOfFile: args[1]),
      let shotCG = shot0.cgImage(forProposedRect: nil, context: nil, hints: nil) else {
    FileHandle.standardError.write("could not read \(args[1])\n".data(using: .utf8)!)
    exit(1)
}

/// The average colour of a band of the image, used to find the bleed tint.
/// Sampled near the top, where every screen in this app puts its strongest
/// glow, and saturated back up afterwards: an average is always duller than
/// the thing it averages, and a dull tint reads as a mistake rather than a
/// choice.
func tint(of image: CGImage) -> NSColor {
    let w = 60, h = 40
    var buf = [UInt8](repeating: 0, count: w * h * 4)
    guard let ctx = CGContext(data: &buf, width: w, height: h, bitsPerComponent: 8,
                              bytesPerRow: w * 4, space: CGColorSpaceCreateDeviceRGB(),
                              bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue)
    else { return NSColor(red: 0.25, green: 0.37, blue: 0.66, alpha: 1) }
    let band = CGRect(x: 0, y: 0, width: image.width, height: image.height / 4)
    if let top = image.cropping(to: band) {
        ctx.draw(top, in: CGRect(x: 0, y: 0, width: w, height: h))
    }
    var r = 0.0, g = 0.0, b = 0.0
    for i in stride(from: 0, to: buf.count, by: 4) {
        r += Double(buf[i]); g += Double(buf[i + 1]); b += Double(buf[i + 2])
    }
    let n = Double(buf.count / 4) * 255.0
    let base = NSColor(red: r / n, green: g / n, blue: b / n, alpha: 1)
        .usingColorSpace(.deviceRGB) ?? .systemBlue
    return NSColor(hue: base.hueComponent,
                   saturation: min(1, base.saturationComponent * 1.9 + 0.15),
                   brightness: min(1, max(0.42, base.brightnessComponent * 1.5)),
                   alpha: 1)
}

let accent = tint(of: shotCG)

let W = wantsSize ? (sizes.first ?? 1080) : shotCG.width
let H = wantsSize ? (sizes.dropFirst().first ?? 1920) : shotCG.height

// Drawn into a bitmap of exactly the requested size, not via NSImage's
// lockFocus. lockFocus renders at the display's backing scale, so on a retina
// Mac it quietly produced 2160x3840 while reporting 1080x1920 — right aspect,
// wrong size, and wrong in a way nothing complains about.
guard let rep = NSBitmapImageRep(
    bitmapDataPlanes: nil, pixelsWide: W, pixelsHigh: H,
    bitsPerSample: 8, samplesPerPixel: 4, hasAlpha: true, isPlanar: false,
    colorSpaceName: .deviceRGB, bytesPerRow: 0, bitsPerPixel: 0
) else { exit(1) }
rep.size = NSSize(width: W, height: H)
guard let gctx = NSGraphicsContext(bitmapImageRep: rep) else { exit(1) }
NSGraphicsContext.saveGraphicsState()
NSGraphicsContext.current = gctx
let ctx = gctx.cgContext

if !cutout {
    // Ground: the app's own near-black, so the slide reads as part of the app
    // and not as a screenshot someone pasted onto a gradient.
    NSColor(red: 0x0B / 255.0, green: 0x0B / 255.0, blue: 0x0C / 255.0, alpha: 1).setFill()
    NSBezierPath(rect: NSRect(x: 0, y: 0, width: W, height: H)).fill()
}

// Two soft circles of the screen's own colour, the same move the app makes
// behind every screen.
func bleed(_ cx: CGFloat, _ cy: CGFloat, _ r: CGFloat, _ alpha: CGFloat) {
    let colors = [accent.withAlphaComponent(alpha).cgColor,
                  accent.withAlphaComponent(0).cgColor] as CFArray
    guard let grad = CGGradient(colorsSpace: CGColorSpaceCreateDeviceRGB(),
                                colors: colors, locations: [0, 1]) else { return }
    ctx.drawRadialGradient(grad, startCenter: CGPoint(x: cx, y: cy), startRadius: 0,
                           endCenter: CGPoint(x: cx, y: cy), endRadius: r,
                           options: .drawsAfterEndLocation)
}
if !cutout {
    bleed(CGFloat(W) * 0.18, CGFloat(H) * 0.80, CGFloat(W) * 0.95, 0.50)
    bleed(CGFloat(W) * 0.88, CGFloat(H) * 0.26, CGFloat(W) * 0.80, 0.34)
}

// The phone, sized to leave a clear margin top and bottom so nothing lands
// under TikTok's own caption and button furniture.
let targetH = CGFloat(H) * (cutout && sizes.count < 2 ? 1.0 : 0.80)
let scale = targetH / CGFloat(shotCG.height)
let targetW = CGFloat(shotCG.width) * scale
let x = (CGFloat(W) - targetW) / 2
let y = (CGFloat(H) - targetH) / 2
let frame = CGRect(x: x, y: y, width: targetW, height: targetH)
let radius = targetW * 0.092   // close to the device's own corner

if !cutout {
    ctx.saveGState()
    ctx.setShadow(offset: .zero, blur: 70, color: accent.withAlphaComponent(0.55).cgColor)
    NSColor.black.setFill()
    NSBezierPath(roundedRect: frame, xRadius: radius, yRadius: radius).fill()
    ctx.restoreGState()
}

ctx.saveGState()
NSBezierPath(roundedRect: frame, xRadius: radius, yRadius: radius).addClip()
ctx.draw(shotCG, in: frame)
ctx.restoreGState()

if !cutout {
    // A hairline so the dark screen never dissolves into the dark ground.
    // Left off a cutout: it has no idea what it is going to be placed on, and
    // an edge drawn for a dark background is a visible seam on a light one.
    NSColor.white.withAlphaComponent(0.16).setStroke()
    let edge = NSBezierPath(roundedRect: frame, xRadius: radius, yRadius: radius)
    edge.lineWidth = 2
    edge.stroke()
}

NSGraphicsContext.restoreGraphicsState()

guard let png = rep.representation(using: .png, properties: [:]) else { exit(1) }
try? png.write(to: URL(fileURLWithPath: args[2]))
print("✓ \(args[2])  \(rep.pixelsWide)x\(rep.pixelsHigh)")
