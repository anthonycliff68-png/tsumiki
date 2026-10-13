// A plain slide, for the beats in a slideshow that are text only.
//
// A slideshow that cuts from a composed screenshot to pure #000 reads as a
// file that failed to load. These are the same ground slide.swift builds —
// a dark field with a soft off-centre glow — minus the phone, so a text-only
// beat still looks like it belongs to the set.
//
// Usage:
//   swift scripts/plain.swift <out.png> [hex] [width] [height]
//
// hex defaults to the app's bg. Pass a habit colour to tint a beat: the
// paywall slides use the orange, the crew slides the blue.

import AppKit
import Foundation

let args = CommandLine.arguments
guard args.count >= 2 else {
    FileHandle.standardError.write("usage: plain.swift <out.png> [hex] [w] [h]\n".data(using: .utf8)!)
    exit(2)
}
let out = args[1]
let hex = args.count > 2 ? args[2] : "3F5FA8"
let nums = args.dropFirst(3).compactMap { Int($0) }
let W = nums.count > 0 ? nums[0] : 1080
let H = nums.count > 1 ? nums[1] : 1920

func colour(_ s: String) -> NSColor {
    var v: UInt64 = 0
    Scanner(string: s.replacingOccurrences(of: "#", with: "")).scanHexInt64(&v)
    return NSColor(red: CGFloat((v >> 16) & 0xff) / 255,
                   green: CGFloat((v >> 8) & 0xff) / 255,
                   blue: CGFloat(v & 0xff) / 255, alpha: 1)
}

let bg = colour("0B0B0C")
let tint = colour(hex)

guard let ctx = CGContext(data: nil, width: W, height: H, bitsPerComponent: 8,
                          bytesPerRow: 0, space: CGColorSpaceCreateDeviceRGB(),
                          bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue) else {
    FileHandle.standardError.write("could not make a context\n".data(using: .utf8)!)
    exit(1)
}

ctx.setFillColor(bg.cgColor)
ctx.fill(CGRect(x: 0, y: 0, width: W, height: H))

// Two blurred circles, the same move every screen in the app makes behind its
// content. Off centre and different sizes, because two concentric circles read
// as a target.
func glow(_ cx: CGFloat, _ cy: CGFloat, _ r: CGFloat, _ alpha: CGFloat) {
    let colours = [tint.withAlphaComponent(alpha).cgColor,
                   tint.withAlphaComponent(0).cgColor] as CFArray
    guard let grad = CGGradient(colorsSpace: CGColorSpaceCreateDeviceRGB(),
                                colors: colours, locations: [0, 1]) else { return }
    ctx.drawRadialGradient(grad, startCenter: CGPoint(x: cx, y: cy), startRadius: 0,
                           endCenter: CGPoint(x: cx, y: cy), endRadius: r,
                           options: .drawsAfterEndLocation)
}

glow(CGFloat(W) * 0.30, CGFloat(H) * 0.74, CGFloat(W) * 0.80, 0.34)
glow(CGFloat(W) * 0.82, CGFloat(H) * 0.30, CGFloat(W) * 0.62, 0.20)

guard let image = ctx.makeImage() else { exit(1) }
let rep = NSBitmapImageRep(cgImage: image)
guard let png = rep.representation(using: .png, properties: [:]) else { exit(1) }
try png.write(to: URL(fileURLWithPath: out))
print("✓ \(out)")
