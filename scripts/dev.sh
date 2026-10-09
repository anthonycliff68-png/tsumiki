#!/usr/bin/env bash
#
# Point the development build at Metro.
#
# The dev launcher advertises the Mac's LAN address, which the simulator often
# cannot reach — it shares the host's network stack and wants 127.0.0.1. This
# opens the client straight at the right URL instead.
#
# iOS asks "Open in Tsumiki?" when a URL arrives for an app that is already
# frontmost, and cancelling that prompt cancels the URL, so the app is
# terminated first.
#
# Usage:  scripts/dev.sh [deep-link-path]
set -euo pipefail

DEVICE="${DEVICE:-iPhone 17 Pro Max}"
BUNDLE="com.tsumiki.app"
PORT="${PORT:-8081}"

curl -s -m 3 "http://127.0.0.1:${PORT}/status" | grep -q running || {
  echo "✗ Metro is not running on ${PORT} — start it with: npx expo start --dev-client"
  exit 1
}

xcrun simctl terminate "$DEVICE" "$BUNDLE" >/dev/null 2>&1 || true
sleep 1
xcrun simctl openurl "$DEVICE" \
  "${BUNDLE}://expo-development-client/?url=http%3A%2F%2F127.0.0.1%3A${PORT}"
echo "✓ opened the development build against 127.0.0.1:${PORT}"
echo "  Changes now reload in about a second. scripts/reload.sh is no longer needed."
