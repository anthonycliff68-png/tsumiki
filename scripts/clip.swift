// Trim a simulator recording into a clip worth posting.
//
// `simctl io recordVideo` starts when you ask it to and stops when you ask it
// to, which means every recording opens and closes on several seconds of a
// still screen. Nobody watches that, and on X the first second is the only one
// you are reliably given.
//
// Also converts to mp4. The recordings come out as QuickTime; X and most other
// places want mp4.
//
// Usage:
//   swift scripts/clip.swift <in.mov> <out.mp4> [start] [end]
//   swift scripts/clip.swift <in.mov> <out.mp4> auto
//
// start and end are seconds. Omit them and nothing is trimmed; pass only start
// and it runs to the end.
//
// `auto` finds the window itself: it samples the video, measures how much each
// frame differs from the one before, and keeps from just before the first real
// movement to just after the last. Hand-picked numbers were consistently
// leaving seconds of a still screen at each end — nobody watches those, and on
// a timeline the opening second is the only one you are reliably given.

import AVFoundation
import Foundation

let args = CommandLine.arguments
guard args.count >= 3 else {
    FileHandle.standardError.write("usage: clip.swift <in.mov> <out.mp4> [start] [end]\n".data(using: .utf8)!)
    exit(2)
}
let input = URL(fileURLWithPath: args[1])
let output = URL(fileURLWithPath: args[2])

let asset = AVURLAsset(url: input)
let duration = CMTimeGetSeconds(asset.duration)

/// How much two frames differ, 0 to 1, on a deliberately tiny thumbnail — this
/// is looking for "something moved", not for detail.
func difference(_ a: [UInt8], _ b: [UInt8]) -> Double {
    guard a.count == b.count, !a.isEmpty else { return 1 }
    var total = 0
    for i in stride(from: 0, to: a.count, by: 4) {
        total += abs(Int(a[i]) - Int(b[i]))
    }
    return Double(total) / Double(a.count / 4) / 255.0
}

func pixels(_ image: CGImage) -> [UInt8] {
    let w = image.width, h = image.height
    var buffer = [UInt8](repeating: 0, count: w * h * 4)
    guard let ctx = CGContext(
        data: &buffer, width: w, height: h, bitsPerComponent: 8, bytesPerRow: w * 4,
        space: CGColorSpaceCreateDeviceRGB(),
        bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue
    ) else { return buffer }
    ctx.draw(image, in: CGRect(x: 0, y: 0, width: w, height: h))
    return buffer
}

/// The first and last moment anything moved.
func busyWindow() -> (Double, Double)? {
    let gen = AVAssetImageGenerator(asset: asset)
    gen.appliesPreferredTrackTransform = true
    gen.requestedTimeToleranceBefore = .zero
    gen.requestedTimeToleranceAfter = .zero
    gen.maximumSize = CGSize(width: 72, height: 156)

    let step = 0.1
    // Below this a frame counts as still. Set by eye against real recordings:
    // high enough to ignore the dock's glow and the status bar clock, low
    // enough to catch a single card changing colour.
    let moved = 0.004

    var previous: [UInt8]?
    var first: Double?
    var last: Double?
    var t = 0.0
    while t < duration {
        if let cg = try? gen.copyCGImage(
            at: CMTime(seconds: t, preferredTimescale: 600), actualTime: nil
        ) {
            let now = pixels(cg)
            if let was = previous, difference(was, now) > moved {
                if first == nil { first = t }
                last = t
            }
            previous = now
        }
        t += step
    }
    guard let a = first, let b = last else { return nil }
    return (a, b)
}

var start = args.count > 3 ? max(0, Double(args[3]) ?? 0) : 0
var end = args.count > 4 ? min(duration, Double(args[4]) ?? duration) : duration

if args.count > 3, args[3].lowercased() == "auto" {
    if let (from, to) = busyWindow() {
        // A breath either side: enough to see the resting state before, and to
        // let the last movement settle after.
        start = max(0, from - 0.35)
        end = min(duration, to + 0.6)
        print(String(format: "  auto: movement from %.2fs to %.2fs", from, to))
    } else {
        FileHandle.standardError.write("nothing moves in that recording\n".data(using: .utf8)!)
        exit(1)
    }
}

guard end > start else {
    FileHandle.standardError.write("the clip ends before it starts (source is \(duration)s)\n".data(using: .utf8)!)
    exit(1)
}

try? FileManager.default.removeItem(at: output)

guard let export = AVAssetExportSession(asset: asset, presetName: AVAssetExportPresetHighestQuality) else {
    FileHandle.standardError.write("could not start an export\n".data(using: .utf8)!)
    exit(1)
}
export.outputURL = output
export.outputFileType = .mp4
export.timeRange = CMTimeRange(
    start: CMTime(seconds: start, preferredTimescale: 600),
    end: CMTime(seconds: end, preferredTimescale: 600)
)

let done = DispatchSemaphore(value: 0)
export.exportAsynchronously { done.signal() }
done.wait()

if export.status == .completed {
    let size = (try? FileManager.default.attributesOfItem(atPath: output.path)[.size] as? Int) ?? 0
    print(String(format: "✓ %@  %.1fs  %.1f MB", output.lastPathComponent, end - start, Double(size ?? 0) / 1_048_576))
} else {
    let message = export.error?.localizedDescription ?? "unknown"
    FileHandle.standardError.write("export failed: \(message)\n".data(using: .utf8)!)
    exit(1)
}
