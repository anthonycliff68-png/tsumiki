#!/usr/bin/env bash
#
# Put the code as it is right now into the simulator.
#
# Why this exists: the Tsumiki build installed on the simulator is a release
# build. A release build carries its JavaScript inside it and never talks to the
# dev server, so editing a file changes nothing you can see — the simulator goes
# on showing whatever was true the day that build was made. Hours went into
# chasing a bug that had already been fixed, on a screen that could not know it.
#
# A proper development build would hot-reload instead, and is the better answer.
# It needs CocoaPods, which needs a Ruby newer than the one Apple ships, which
# needs Homebrew. Until that is set up, this does the same job in a minute: it
# builds the JavaScript, drops it into the installed app, and relaunches.
#
# Usage:  scripts/reload.sh [deep-link-path]
#         scripts/reload.sh                 # opens on Today
#         scripts/reload.sh /progress       # opens straight to a screen
set -euo pipefail

DEVICE="${DEVICE:-iPhone 17 Pro Max}"
BUNDLE="com.tsumiki.app"
PATH_TO_OPEN="${1:-/}"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

echo "› building the JavaScript"
mkdir -p "$WORK/assets"
npx expo export:embed \
  --platform ios --dev false \
  --entry-file node_modules/expo-router/entry.js \
  --bundle-output "$WORK/main.jsbundle" \
  --assets-dest "$WORK/assets" 2>&1 | grep -E "Bundled|error" || true

[ -f "$WORK/main.jsbundle" ] || { echo "✗ the bundle did not build"; exit 1; }

xcrun simctl bootstatus "$DEVICE" -b >/dev/null 2>&1 || xcrun simctl boot "$DEVICE" >/dev/null 2>&1 || true

APP="$(xcrun simctl get_app_container "$DEVICE" "$BUNDLE")"
cp "$WORK/main.jsbundle" "$APP/main.jsbundle"
cp -R "$WORK/assets/." "$APP/assets/" 2>/dev/null || true

# Terminated first, because iOS asks "Open in Tsumiki?" when a URL arrives for
# an app that is already in front, and that prompt needs a tap.
xcrun simctl terminate "$DEVICE" "$BUNDLE" >/dev/null 2>&1 || true
sleep 1
xcrun simctl openurl "$DEVICE" "tsumiki://${PATH_TO_OPEN}"
echo "✓ running today's code, opened on ${PATH_TO_OPEN}"
