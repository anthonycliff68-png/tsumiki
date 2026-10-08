#!/usr/bin/env bash
#
# Lay the demo assets out in Downloads, a folder per day, ready to post.
#
# docs/demos/ is the repo's copy: flat, date-prefixed, and what changelog.md
# links to. Good for the record, awkward for actually making a post — you end up
# hunting through one folder for the clip you want.
#
# This mirrors them into ~/Downloads/Tsumiki Posts/<date>/, drops the date
# prefix once the folder carries it, and puts the drafts in beside them. Copies
# rather than moves: the changelog links to the repo's copies.
#
# Usage:  scripts/stage.sh
set -euo pipefail

DEST="${TSUMIKI_POSTS:-$HOME/Downloads/Tsumiki Posts}"
SRC="docs/demos"

[ -d "$SRC" ] || { echo "no $SRC yet — capture something first"; exit 1; }

count=0
for file in "$SRC"/*; do
  [ -f "$file" ] || continue
  base="$(basename "$file")"
  # 2026-10-08-my-day-before.png -> 2026-10-08 / my-day-before.png
  case "$base" in
    [0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]-*)
      day="${base:0:10}"
      name="${base:11}"
      ;;
    *)
      # Anything not dated goes in a folder that says so, rather than being
      # silently dropped or silently misfiled.
      day="undated"
      name="$base"
      ;;
  esac
  mkdir -p "$DEST/$day"
  cp -p "$file" "$DEST/$day/$name"
  count=$((count + 1))
done

# The drafts travel with the pictures; writing a post means having both open.
[ -f docs/content.md ] && cp -p docs/content.md "$DEST/posts.md"

echo "✓ $count file(s) staged in $DEST"
find "$DEST" -mindepth 1 -maxdepth 1 -type d | sort | while read -r d; do
  echo "  $(basename "$d") — $(find "$d" -type f | wc -l | tr -d ' ') file(s)"
done
