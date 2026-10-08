#!/usr/bin/env bash
#
# Check that the record is actually a record.
#
# Written after three changelog entries were found pointing at commits that do
# not exist on the branch. The cause was writing a commit's hash into the file
# and then running `git commit --amend`, which makes a different commit and
# discards the one named. The entries looked right, and git could even resolve
# the hashes locally, because the orphans were still in the object store — they
# would have meant nothing to anybody else.
#
# Checks, in order of how quietly each one fails:
#   - every hash an entry names is a commit reachable from HEAD
#   - every entry has a Content line pointing at a draft
#   - every clip the changelog links to exists on disk
#
# Usage:  scripts/check-record.sh
set -uo pipefail

LOG=docs/changelog.md
CONTENT=docs/content.md
fail=0

note() { echo "  ✗ $1"; fail=1; }

echo "Checking $LOG"

# --- hashes -----------------------------------------------------------------
grep -o '`[0-9a-f]\{7,40\}`' "$LOG" | tr -d '`' | sort -u | while read -r sha; do
  if ! git merge-base --is-ancestor "$sha" HEAD 2>/dev/null; then
    echo "  ✗ $sha is not a commit on this branch"
  fi
done | tee /tmp/.record-hashes
[ -s /tmp/.record-hashes ] && fail=1

# --- a content draft per entry ----------------------------------------------
entries=$(grep -c '^### ' "$LOG")
linked=$(grep -c '^\*\*Content:\*\*' "$LOG")
if [ "$entries" -ne "$linked" ]; then
  note "$entries entries but $linked Content lines — one of them was never written up"
fi

drafts=$(grep -c '^## .* · ' "$CONTENT")
if [ "$drafts" -lt "$linked" ]; then
  note "$linked entries point at $CONTENT but it holds $drafts drafts"
fi

# --- the clips themselves ---------------------------------------------------
grep -o "(demos/[^)]*\.mp4)" "$LOG" | tr -d "()" | sort -u | while read -r rel; do
  [ -f "docs/$rel" ] || echo "  ✗ docs/$rel is linked but not on disk"
done | tee /tmp/.record-files
[ -s /tmp/.record-files ] && fail=1

rm -f /tmp/.record-hashes /tmp/.record-files
if [ "$fail" -eq 0 ]; then
  echo "✓ $entries entries, every hash on the branch, every clip present"
fi
exit "$fail"
