#!/usr/bin/env bash
#
# Install every skill in this repo as a symlink into ~/.claude/skills/
#
# Discovers skills by walking for SKILL.md at any depth, so future
# category subdirs (e.g. skills/engineering/<name>/SKILL.md) work without
# changes to this script.
#
# Usage:    ./install.sh
# Idempotent: safe to re-run. Existing correct symlinks are left alone;
# conflicts (different target, or a real file/dir in the way) are reported,
# never overwritten.

set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SKILLS_DIR="$HOME/.claude/skills"

# Bail out if ~/.claude/skills is itself a symlink into this repo — otherwise
# we'd write per-skill symlinks back into the repo's own tree.
if [[ -L "$SKILLS_DIR" ]]; then
  resolved="$(readlink "$SKILLS_DIR")"
  case "$resolved" in
    "$REPO_DIR"|"$REPO_DIR"/*)
      echo "error: $SKILLS_DIR is a symlink into this repo ($resolved)." >&2
      echo "Remove it (rm \"$SKILLS_DIR\") and re-run; the script will recreate it as a real dir." >&2
      exit 1
      ;;
  esac
fi

mkdir -p "$SKILLS_DIR"

installed=0
skipped=0
conflicts=0

while IFS= read -r -d '' skill_md; do
  skill_path="$(dirname "$skill_md")"
  skill_name="$(basename "$skill_path")"
  target="$SKILLS_DIR/$skill_name"

  if [[ -L "$target" ]]; then
    existing="$(readlink "$target")"
    if [[ "$existing" == "$skill_path" ]]; then
      printf "  [already linked] %s\n" "$skill_name"
      skipped=$((skipped + 1))
    else
      printf "  [CONFLICT]       %s -> existing symlink points to %s\n" "$skill_name" "$existing"
      conflicts=$((conflicts + 1))
    fi
    continue
  fi

  if [[ -e "$target" ]]; then
    printf "  [CONFLICT]       %s -> %s exists and is not a symlink\n" "$skill_name" "$target"
    conflicts=$((conflicts + 1))
    continue
  fi

  ln -s "$skill_path" "$target"
  printf "  [installed]      %s\n" "$skill_name"
  installed=$((installed + 1))
done < <(find "$REPO_DIR" -name SKILL.md -not -path '*/node_modules/*' -not -path '*/.git/*' -not -path '*/deprecated/*' -print0)

echo
printf "Summary: installed=%d skipped=%d conflicts=%d\n" "$installed" "$skipped" "$conflicts"
if (( conflicts > 0 )); then
  echo "Resolve conflicts manually (rm or rename the offender), then re-run."
fi
echo "Skills load on the next Claude Code session start."
