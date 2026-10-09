#!/usr/bin/env bash
#
# Put the thing you just fixed on the screen, now.
#
# The point of a development build is that a change is visible in about a
# second. That only pays off if getting to the screen is also about a second,
# and until now it was three commands and a guess at whether the client was
# still attached to Metro.
#
# This does the lot: starts Metro if it is not up, reattaches the development
# build if it has drifted, and opens the route. Run it the moment a fix
# compiles — the whole habit is to look at the change rather than take anyone's
# word for it.
#
# Usage:
#   scripts/try.sh                 # Today
#   scripts/try.sh /progress       # a tab
#   scripts/try.sh /crew/<id>      # a screen that lives at an id
#
# Screens that need particular state to be interesting are listed in
# docs/screens.md under "Needs". A few refuse to open at all when the account
# is wrong for them — routine setup sends you away if you already have moments,
# which is correct and is why a fresh account is the only way to see it.
set -euo pipefail

DEVICE="${DEVICE:-iPhone 17 Pro Max}"
BUNDLE="com.tsumiki.app"
PORT="${PORT:-8081}"
ROUTE="${1:-/}"

running() { curl -s -m 3 "http://127.0.0.1:${PORT}/status" 2>/dev/null | grep -q running; }

if ! running; then
  echo "› Metro is not up — starting it"
  npx expo start --dev-client --port "$PORT" >/tmp/tsumiki-metro.log 2>&1 &
  for _ in $(seq 1 40); do
    running && break
    sleep 1
  done
  running || { echo "✗ Metro did not come up. See /tmp/tsumiki-metro.log"; exit 1; }
fi

xcrun simctl bootstatus "$DEVICE" -b >/dev/null 2>&1 || xcrun simctl boot "$DEVICE" >/dev/null 2>&1 || true

xcrun simctl get_app_container "$DEVICE" "$BUNDLE" >/dev/null 2>&1 || {
  echo "✗ Tsumiki is not installed on $DEVICE."
  echo "  Install the development build:"
  echo "    npx eas-cli build:run --platform ios --id <build-id>"
  exit 1
}

# Terminated first, because iOS asks "Open in Tsumiki?" when a URL arrives for
# an app already in front, and cancelling that prompt cancels the URL.
xcrun simctl terminate "$DEVICE" "$BUNDLE" >/dev/null 2>&1 || true
sleep 1

# The dev client wants the dev server first; the route follows once it is up.
# It advertises the Mac's LAN address, which the simulator often cannot reach —
# it shares the host's network stack and wants 127.0.0.1.
xcrun simctl openurl "$DEVICE" \
  "${BUNDLE}://expo-development-client/?url=http%3A%2F%2F127.0.0.1%3A${PORT}" >/dev/null
sleep 9

if [ "$ROUTE" != "/" ]; then
  xcrun simctl openurl "$DEVICE" "tsumiki://${ROUTE}" >/dev/null
fi

open -a Simulator >/dev/null 2>&1 || true
echo "✓ Tsumiki is on ${ROUTE} — go and look at it"
