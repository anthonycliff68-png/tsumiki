#!/usr/bin/env bash
#
# Empty a test account and the simulator, so onboarding runs again from step 1
# without sending a single email.
#
# Deleting the account is the expensive way to do this: a new account needs a
# new sign-in code, and the email sender is rate limited to a couple an hour.
# This keeps the login and empties everything hanging off it.
#
# Needs TEST_USER_ID in scripts/shots.env — the uuid of a throwaway account,
# never your own. Find it with:
#   select id, email from auth.users order by created_at desc;
#
# Usage:  scripts/reset-test-account.sh
set -euo pipefail

[ -f scripts/shots.env ] && . scripts/shots.env
DEVICE="${DEVICE:-iPhone 17 Pro Max}"
BUNDLE="com.tsumiki.app"

[ -n "${TEST_USER_ID:-}" ] || {
  echo "✗ No TEST_USER_ID in scripts/shots.env."
  echo "  Add the uuid of a throwaway account — never your own:"
  echo "    TEST_USER_ID=00000000-0000-0000-0000-000000000000"
  exit 1
}

echo "› emptying $TEST_USER_ID"
# The CLI has no variable binding, so the id is substituted here. It is checked
# against the uuid shape first: this script issues deletes, and a malformed id
# reaching the SQL is not something to find out about afterwards.
echo "$TEST_USER_ID" | grep -qE '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' || {
  echo "✗ TEST_USER_ID is not a uuid: $TEST_USER_ID"
  exit 1
}
SQL="$(mktemp)"
trap 'rm -f "$SQL"' EXIT
sed "s/__USER__/$TEST_USER_ID/g" scripts/reset-test-account.sql > "$SQL"
./node_modules/.bin/supabase db query --linked --file "$SQL" 2>&1 \
  | grep -E '"anchors"|"habits"|"checkins"|error' || true

echo "› clearing the simulator"
xcrun simctl uninstall "$DEVICE" "$BUNDLE" >/dev/null 2>&1 || true

cat <<'DONE'
✓ account emptied and the app removed from the simulator

  Reinstall the development build, then sign in with the password — no code,
  no email — and you land on the welcome carousel with setup from step 1:

    npx eas-cli build:run --platform ios --id <build-id>
    scripts/try.sh
DONE
