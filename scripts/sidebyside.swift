// Put a before and an after in one video, playing together.
//
// Two clips posted as a pair arrive as two thumbnails, play separately, and
// leave the reader holding the first one in their head while they watch the
// second. Side by side they are one thing, and the difference is the subject
// rather than something to be remembered and compared.
//
// The shorter clip loops to fill the longer one, so neither side ever goes
// blank — a comparison with a dead half reads as a broken video.
//
// Usage:
//   swift scripts/sidebyside.swift <before.mp4> <after.mp4> <out.mp4> ["Title"]

import AVFoundation
import AppKit
import Foundation

let args = CommandLine.arguments
guard args.count >= 4 else {
    FileHandle.standardError.write("usage: sidebyside.swift <before> <after> <out> [title]\n".data(using: .utf8)!)
    exit(2)
}
let beforeURL = URL(fileURLWithPath: args[1])
let afterURL = URL(fileURLWithPath: args[2])
let outURL = URL(fileURLWithPath: args[3])
let title = args.count > 4 ? args[4] : ""

// --- the app's own ground ---------------------------------------------------
let bg = NSColor(srgbRed: 0x0B / 255, green: 0x0B / 255, blue: 0x0C / 255, alpha: 1)
let faint = NSColor(srgbRed: 0x8E / 255, green: 0x88 / 255, blue: 0x7E / 255, alpha: 1)
let fg = NSColor(srgbRed: 0xF4 / 255, green: 0xF1 / 255, blue: 0xEC / 255, alpha: 1)

// --- layout -----------------------------------------------------------------
let phoneH: CGFloat = 1360
let gap: CGFloat = 44
let side: CGFloat = 44
let labelBand: CGFloat = title.isEmpty ? 96 : 184
let bottom: CGFloat = 44

func displaySize(_ track: AVAssetTrack) -> CGSize {
    let s = track.naturalSize.applying(track.preferredTransform)
    return CGSize(width: abs(s.width), height: abs(s.height))
}

let beforeAsset = AVURLAsset(url: beforeURL)
let afterAsset = AVURLAsset(url: afterURL)
guard let bTrack = beforeAsset.tracks(withMediaType: .video).first,
      let aTrack = afterAsset.tracks(withMediaType: .video).first else {
    FileHandle.standardError.write("one of those files has no video in it\n".data(using: .utf8)!)
    exit(1)
}

let bSize = displaySize(bTrack), aSize = displaySize(aTrack)
let bScale = phoneH / bSize.height, aScale = phoneH / aSize.height
let bW = (bSize.width * bScale).rounded(), aW = (aSize.width * aScale).rounded()

// Even numbers, or h264 refuses the frame size.
func even(_ v: CGFloat) -> CGFloat { let r = v.rounded(); return r.truncatingRemainder(dividingBy: 2) == 0 ? r : r + 1 }
let W = even(side * 2 + bW + gap + aW)
let H = even(labelBand + phoneH + bottom)

// The longer clip sets the length; the shorter one repeats into it.
let target = max(beforeAsset.duration.seconds, afterAsset.duration.seconds)
let targetTime = CMTime(seconds: target, preferredTimescale: 600)

let composition = AVMutableComposition()

/// Lay a clip into its own track, looping until the comparison is full.
func lay(_ asset: AVURLAsset, _ track: AVAssetTrack) -> AVMutableCompositionTrack? {
    guard let dest = composition.addMutableTrack(
        withMediaType: .video, preferredTrackID: kCMPersistentTrackID_Invalid
    ) else { return nil }
    var at = CMTime.zero
    let whole = CMTimeRange(start: .zero, duration: asset.duration)
    while at < targetTime {
        let left = targetTime - at
        let piece = left < asset.duration
            ? CMTimeRange(start: .zero, duration: left)
            : whole
        try? dest.insertTimeRange(piece, of: track, at: at)
        at = at + piece.duration
        if piece.duration.seconds <= 0 { break }
    }
    return dest
}

guard let bDest = lay(beforeAsset, bTrack), let aDest = lay(afterAsset, aTrack) else {
    FileHandle.standardError.write("could not build the composition\n".data(using: .utf8)!)
    exit(1)
}

/// Scale a source into place. The render space has its origin at the top left,
/// so y is measured down from the top of the canvas.
func place(_ track: AVAssetTrack, into dest: AVMutableCompositionTrack, x: CGFloat, scale: CGFloat)
    -> AVMutableVideoCompositionLayerInstruction {
    let layer = AVMutableVideoCompositionLayerInstruction(assetTrack: dest)
    let t = track.preferredTransform
        .concatenating(CGAffineTransform(scaleX: scale, y: scale))
        .concatenating(CGAffineTransform(translationX: x, y: labelBand))
    layer.setTransform(t, at: .zero)
    return layer
}

let instruction = AVMutableVideoCompositionInstruction()
instruction.timeRange = CMTimeRange(start: .zero, duration: targetTime)
instruction.layerInstructions = [
    place(aTrack, into: aDest, x: side + bW + gap, scale: aScale),
    place(bTrack, into: bDest, x: side, scale: bScale),
]
instruction.backgroundColor = bg.cgColor

let videoComposition = AVMutableVideoComposition()
videoComposition.renderSize = CGSize(width: W, height: H)
videoComposition.frameDuration = CMTime(value: 1, timescale: 60)
videoComposition.instructions = [instruction]

// --- the labels, burned in --------------------------------------------------
// Core Animation's origin is the bottom left, unlike the render space above.
let parent = CALayer()
parent.frame = CGRect(x: 0, y: 0, width: W, height: H)
parent.backgroundColor = bg.cgColor

let videoLayer = CALayer()
videoLayer.frame = parent.frame
parent.addSublayer(videoLayer)

// Drawn into one image rather than built from CATextLayers: the animation tool
// renders a CATextLayer's attributed string inconsistently, and a label that
// silently fails to appear is worse than no label. An image either draws or it
// does not.
func label(_ string: String, size: CGFloat, weight: NSFont.Weight, color: NSColor,
           tracking: CGFloat, x: CGFloat, yFromTop: CGFloat, width: CGFloat) {
    let attrs: [NSAttributedString.Key: Any] = [
        .font: NSFont.systemFont(ofSize: size, weight: weight),
        .foregroundColor: color,
        .kern: tracking,
    ]
    let text = NSAttributedString(string: string, attributes: attrs)
    let w = text.size().width
    // Centred in its column, and measured down from the top like everything
    // else in this file, so the two coordinate systems never have to be held
    // in the head at once.
    text.draw(at: CGPoint(x: x + (width - w) / 2, y: H - yFromTop - text.size().height))
}

let overlay = NSImage(size: NSSize(width: W, height: H))
overlay.lockFocus()
if !title.isEmpty {
    label(title.uppercased(), size: 54, weight: .black, color: fg,
          tracking: -0.5, x: side, yFromTop: 44, width: W - side * 2)
}
let labelY = labelBand - 52
label("BEFORE", size: 30, weight: .heavy, color: faint, tracking: 4,
      x: side, yFromTop: labelY, width: bW)
label("AFTER", size: 30, weight: .heavy, color: faint, tracking: 4,
      x: side + bW + gap, yFromTop: labelY, width: aW)
overlay.unlockFocus()

if let cg = overlay.cgImage(forProposedRect: nil, context: nil, hints: nil) {
    let text = CALayer()
    text.frame = parent.frame
    text.contents = cg
    parent.addSublayer(text)
}

videoComposition.animationTool = AVVideoCompositionCoreAnimationTool(
    postProcessingAsVideoLayer: videoLayer, in: parent
)

// --- export -----------------------------------------------------------------
try? FileManager.default.removeItem(at: outURL)
guard let export = AVAssetExportSession(asset: composition, presetName: AVAssetExportPresetHighestQuality) else {
    FileHandle.standardError.write("could not start an export\n".data(using: .utf8)!)
    exit(1)
}
export.outputURL = outURL
export.outputFileType = .mp4
export.videoComposition = videoComposition

let done = DispatchSemaphore(value: 0)
export.exportAsynchronously { done.signal() }
done.wait()

if export.status == .completed {
    let size = (try? FileManager.default.attributesOfItem(atPath: outURL.path)[.size] as? Int) ?? 0
    print(String(format: "✓ %@  %.0f×%.0f  %.1fs  %.1f MB",
                 outURL.lastPathComponent, W, H, target, Double(size ?? 0) / 1_048_576))
} else {
    FileHandle.standardError.write("export failed: \(export.error?.localizedDescription ?? "unknown")\n".data(using: .utf8)!)
    exit(1)
}
