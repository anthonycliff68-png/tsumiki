#!/usr/bin/env bash
#
# Record the simulator to an .mp4 you can post.
#
# Built because an animation cannot be checked in a screenshot. A still lands
# after the thing has happened, which is how a splash got built three times
# without anybody noticing it was invisible. It is also how the before and
# after of a change get kept, which is the point of docs/changelog.md.
#
# Usage:
#   scripts/record.sh walk-the-day          # start recording, Enter to stop
#   scripts/record.sh check-in /my-day      # open a screen first, then record
#
# The clip lands in docs/demos/<name>.mp4. Interact with the simulator while it
# runs: it records the screen, not a script.
set -euo pipefail

NAME="${1:?usage: scripts/record.sh <name> [deep-link-path]}"
ROUTE="${2:-}"
DEVICE="${DEVICE:-iPhone 17 Pro Max}"
BUNDLE="com.tsumiki.app"
OUT="docs/demos"
mkdir -p "$OUT"

if [ -n "$ROUTE" ]; then
  xcrun simctl terminate "$DEVICE" "$BUNDLE" >/dev/null 2>&1 || true
  sleep 1
  xcrun simctl openurl "$DEVICE" "tsumiki://${ROUTE}" >/dev/null
  sleep 6
fi

RAW="$(mktemp -d)/clip.mov"
echo "● recording — do the thing, then press Enter"
xcrun simctl io "$DEVICE" recordVideo --codec h264 --force "$RAW" >/dev/null 2>&1 &
REC=$!
read -r _ || true
kill -INT "$REC" 2>/dev/null || true
wait "$REC" 2>/dev/null || true
sleep 1

# avconvert ships with macOS; ffmpeg does not, and this machine has no Homebrew
# to fetch it with.
avconvert --source "$RAW" --output "$OUT/${NAME}.mp4" --preset PresetHighestQuality --progress >/dev/null 2>&1
rm -rf "$(dirname "$RAW")"
echo "✓ $OUT/${NAME}.mp4"
