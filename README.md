# skillsmills

Craig's personal skill library for Claude Code. Each top-level directory is one skill with a `SKILL.md` inside.

Skills here are lightweight — instructions and templates, not CLI tools or heavy scripts.

## Installation

This repo is a [Claude Code plugin](https://docs.anthropic.com/en/docs/claude-code/plugins), so the preferred install path is the plugin manager:

```
/plugin install craigmmills/skillsmills
```

Or, if you'd rather clone and symlink manually (e.g. so you can edit skills in-place and have changes take effect immediately):

```sh
git clone git@github.com:craigmmills/skillsmills.git ~/Projects/skillsmills
~/Projects/skillsmills/install.sh
```

`install.sh` walks for every `SKILL.md` in the repo and symlinks its parent directory into `~/.claude/skills/`. It's idempotent — re-run any time you add a new skill or pull updates. Conflicts (existing symlinks pointing elsewhere, or real files in the way) are reported and skipped, never overwritten.

Skills become available on the next Claude Code session start.

## Adding a new skill

1. Create `<skill-name>/SKILL.md` at the repo root.
2. Re-run `./install.sh`.
3. Restart Claude Code so the new skill loads.
4. Update the "Current skills" list below.

## Current skills

- **[`seed-four-layers/`](seed-four-layers/SKILL.md)** — Coach a new project into the four-layer pattern (SoT, Framework, Studio, Output) and scaffold a short manifest plus per-layer READMEs.
- **[`build-presentation/`](build-presentation/SKILL.md)** — Install a project-local Google Slides deck generator (Python + JSON spec → editable deck) with per-project OAuth credentials.
- **[`presentation-architect/`](presentation-architect/SKILL.md)** — Interactive walkthrough that builds powerful, memorable presentations by synthesising Patrick Winston (MIT), Nancy Duarte (Resonate), and Simon Sinek (Start With Why). From core message to opening script, slide outline, and strong close.
- **[`mermaid-to-miro/`](mermaid-to-miro/SKILL.md)** — Install a project-local Node tool that turns a folder of Mermaid diagrams into an editable Miro board: auto-layout (dagre), one frame per diagram or grouped into titled sections, a legend, and the boxes inside each container grouped so they move together.

## Future direction

This repo is intended to become the canonical home for skills currently scattered across `~/.agents/skills/`, per-project `.claude/skills/` dirs, and other repos. Migration is a separate task — not in scope for individual skill work.
