# skillsmills

Craig's personal skill library for Claude Code. Each top-level directory is one skill with a `SKILL.md` inside.

Skills here are lightweight — instructions and templates, not CLI tools or heavy scripts.

## Installation

Clone the repo, then run the installer. It symlinks every skill into `~/.claude/skills/` so they become system-available the next time Claude Code starts.

```sh
git clone git@github.com:<your-github>/skillsmills.git ~/Projects/skillsmills
cd ~/Projects/skillsmills
./install.sh
```

The installer is idempotent — re-run any time you add a new skill or pull updates. It never overwrites an existing symlink that points elsewhere; conflicts are reported, not silently resolved.

## Adding a new skill

1. Create `<skill-name>/SKILL.md` at the repo root.
2. Re-run `./install.sh`.
3. Restart Claude Code so the new skill loads.
4. Update the "Current skills" list below.

## Current skills

- **[`seed-four-layers/`](seed-four-layers/SKILL.md)** — Coach a new project into the four-layer pattern (SoT, Framework, Studio, Output) and scaffold a short manifest plus per-layer READMEs.

## Future direction

This repo is intended to become the canonical home for skills currently scattered across `~/.agents/skills/`, per-project `.claude/skills/` dirs, and other repos. Migration is a separate task — not in scope for individual skill work.
