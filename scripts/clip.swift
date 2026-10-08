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
//
// start and end are seconds. Omit them and nothing is trimmed; pass only start
// and it runs to the end.

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
let start = args.count > 3 ? max(0, Double(args[3]) ?? 0) : 0
let end = args.count > 4 ? min(duration, Double(args[4]) ?? duration) : duration

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
