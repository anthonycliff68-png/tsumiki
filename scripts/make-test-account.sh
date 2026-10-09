#!/usr/bin/env bash
#
# Recreate the throwaway test account after something deleted it.
#
# Needed because testing account deletion destroys the login it was testing
# with, and getting a new one costs a sign-up code against a rate-limited
# sender. Same uuid each time, so scripts/shots.env stays correct.
#
# Usage:  scripts/make-test-account.sh
set -euo pipefail

[ -f scripts/shots.env ] && . scripts/shots.env

for v in TEST_USER_ID TEST_USER_EMAIL TEST_USER_PASSWORD; do
  [ -n "${!v:-}" ] || { echo "✗ No $v in scripts/shots.env"; exit 1; }
done

echo "$TEST_USER_ID" | grep -qE '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' || {
  echo "✗ TEST_USER_ID is not a uuid"; exit 1
}

SQL="$(mktemp)"
trap 'rm -f "$SQL"' EXIT
sed -e "s/__USER__/$TEST_USER_ID/g" \
    -e "s/__EMAIL__/$TEST_USER_EMAIL/g" \
    -e "s/__PASSWORD__/$TEST_USER_PASSWORD/g" \
    scripts/make-test-account.sql > "$SQL"

./node_modules/.bin/supabase db query --linked --file "$SQL" 2>&1 \
  | grep -E '"auth_user"|"identity"|"profile"|error' || true

echo "✓ test account restored — sign in with the password, no email needed"
