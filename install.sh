#!/usr/bin/env bash
#
# Install every skill in this repo as a symlink into ~/.claude/skills/
#
# Usage:    ./install.sh
# Idempotent: safe to re-run. Existing correct symlinks are left alone;
# conflicts (different target, or a real file/dir in the way) are reported,
# never overwritten.

set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SKILLS_DIR="$HOME/.claude/skills"

mkdir -p "$SKILLS_DIR"

installed=0
skipped=0
conflicts=0

shopt -s nullglob
for skill_path in "$REPO_DIR"/*/; do
  skill_path="${skill_path%/}"
  skill_name="$(basename "$skill_path")"

  # Only directories containing a SKILL.md count as skills.
  [[ -f "$skill_path/SKILL.md" ]] || continue

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
done

echo
printf "Summary: installed=%d skipped=%d conflicts=%d\n" "$installed" "$skipped" "$conflicts"
if (( conflicts > 0 )); then
  echo "Resolve conflicts manually (rm or rename the offender), then re-run."
fi
echo "Skills load on the next Claude Code session start."
