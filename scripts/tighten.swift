// Cut the dead air out of the middle of a recording, not just off the ends.
//
// clip.swift trims the still screen at each end. That was never the whole
// problem: driving the simulator leaves two or three seconds of nothing
// between every tap, and a sixty second clip of a forty second flow reads as
// a slow app. It is not the app that is slow.
//
// This finds every stretch where the screen does not change, and keeps only a
// beat of it. Animations are left at their real speed — speeding the whole
// video up would misrepresent them, which is the one thing a demo must not
// do. Only the waiting is removed.
//
// Usage:
//   swift scripts/tighten.swift <in.mov> <out.mp4> [hold] [threshold]
//
// hold       seconds of a still stretch to keep (default 0.4)
// threshold  how much movement counts as movement (default 0.0025)

import AVFoundation
import Foundation

let args = CommandLine.arguments
guard args.count >= 3 else {
    FileHandle.standardError.write("usage: tighten.swift <in.mov> <out.mp4> [hold] [threshold]\n".data(using: .utf8)!)
    exit(2)
}
let input = URL(fileURLWithPath: args[1])
let output = URL(fileURLWithPath: args[2])
let hold = args.count > 3 ? Double(args[3]) ?? 0.4 : 0.4
let threshold = args.count > 4 ? Double(args[4]) ?? 0.0025 : 0.0025

let asset = AVURLAsset(url: input)
let duration = CMTimeGetSeconds(asset.duration)
let step = 0.2

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

func difference(_ a: [UInt8], _ b: [UInt8]) -> Double {
    guard a.count == b.count, !a.isEmpty else { return 1 }
    var total = 0
    for i in stride(from: 0, to: a.count, by: 4) { total += abs(Int(a[i]) - Int(b[i])) }
    return Double(total) / Double(a.count / 4) / 255.0
}

// Sample the whole video once. A small thumbnail is plenty: this asks "did
// anything move", not "what moved".
let gen = AVAssetImageGenerator(asset: asset)
gen.appliesPreferredTrackTransform = true
gen.requestedTimeToleranceBefore = .zero
gen.requestedTimeToleranceAfter = .zero
gen.maximumSize = CGSize(width: 90, height: 0)

var times: [Double] = []
var t = 0.0
while t < duration { times.append(t); t += step }

var moving = [Bool](repeating: true, count: times.count)
var previous: [UInt8]? = nil
for (i, time) in times.enumerated() {
    guard let cg = try? gen.copyCGImage(at: CMTime(seconds: time, preferredTimescale: 600), actualTime: nil)
    else { continue }
    let now = pixels(cg)
    if let was = previous { moving[i] = difference(was, now) > threshold }
    previous = now
}

// Walk the samples and build the ranges worth keeping: everything that moves,
// plus `hold` seconds at the front of each still stretch so a finished screen
// is readable before the next thing happens.
var keep: [(Double, Double)] = []
var i = 0
while i < times.count {
    if moving[i] {
        let start = times[i]
        while i < times.count && moving[i] { i += 1 }
        let end = i < times.count ? times[i] : duration
        keep.append((start, end))
    } else {
        let start = times[i]
        while i < times.count && !moving[i] { i += 1 }
        keep.append((start, min(start + hold, i < times.count ? times[i] : duration)))
    }
}

// Merge anything that now touches, so the composition is a handful of ranges
// rather than hundreds of one-frame ones.
var merged: [(Double, Double)] = []
for range in keep where range.1 > range.0 + 0.01 {
    if var last = merged.last, range.0 - last.1 < 0.05 {
        last.1 = range.1
        merged[merged.count - 1] = last
    } else {
        merged.append(range)
    }
}

guard !merged.isEmpty else {
    FileHandle.standardError.write("nothing moved in this recording\n".data(using: .utf8)!)
    exit(1)
}

let composition = AVMutableComposition()
guard let sourceTrack = asset.tracks(withMediaType: .video).first,
      let track = composition.addMutableTrack(withMediaType: .video, preferredTrackID: kCMPersistentTrackID_Invalid)
else { exit(1) }
track.preferredTransform = sourceTrack.preferredTransform

var cursor = CMTime.zero
for (start, end) in merged {
    let range = CMTimeRange(
        start: CMTime(seconds: start, preferredTimescale: 600),
        end: CMTime(seconds: end, preferredTimescale: 600)
    )
    try? track.insertTimeRange(range, of: sourceTrack, at: cursor)
    cursor = cursor + range.duration
}

try? FileManager.default.removeItem(at: output)
guard let export = AVAssetExportSession(asset: composition, presetName: AVAssetExportPresetHighestQuality) else { exit(1) }
export.outputURL = output
export.outputFileType = .mp4

let done = DispatchSemaphore(value: 0)
export.exportAsynchronously { done.signal() }
done.wait()

if export.status == .completed {
    let kept = merged.reduce(0.0) { $0 + ($1.1 - $1.0) }
    print(String(format: "✓ %@  %.1fs → %.1fs (%d cuts)", output.lastPathComponent, duration, kept, merged.count - 1))
} else {
    FileHandle.standardError.write("✗ \(export.error?.localizedDescription ?? "export failed")\n".data(using: .utf8)!)
    exit(1)
}
