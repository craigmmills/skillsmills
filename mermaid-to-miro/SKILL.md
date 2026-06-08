---
name: mermaid-to-miro
description: Turn a folder of Mermaid diagrams into an editable, collaborative Miro board — one frame per diagram (or grouped into titled sections), with auto-layout, a legend, and the boxes inside each container grouped so they move together. Use when the user wants their Mermaid diagrams as an editable Miro board, wants to edit/collaborate on diagrams after generating them, or invokes /build-miro-board. The skill installs a small project-local Node tool the first time it runs, then drives it via a project slash command.
---

# mermaid-to-miro

A reusable pattern for turning **Mermaid** diagrams into an **editable Miro board**.

Mermaid is great as a text source of truth but its rendered output is frozen —
you can't drag a box or tweak a label after the fact. This skill bridges that:
it parses your Mermaid, lays it out with **dagre** (the same engine Mermaid
uses), maps your `classDef`/`style` to Miro styles, and builds a real Miro board
of editable shapes and connectors. Mermaid stays canonical; Miro is where people
edit and collaborate.

## What this skill does

- **Installs** a project-local `tools/mermaid-to-miro/` directory: a small Node
  converter (no framework, just `@dagrejs/dagre` + the Miro REST API), a setup
  guide, and a `/build-miro-board` slash command.
- **Drives it** to build a board from a folder of diagrams — one titled frame per
  diagram by default, or grouped into titled **sections with description panels**
  if you configure them.
- Preserves your diagram styling, **groups the boxes inside each container** so a
  "bigger box" and its contents move together, and adds a **legend** that always
  matches what's drawn.

The skill contains the engine as a template. **It stores no credentials, tokens,
or project-specific content.**

## When to use

- The user wants their Mermaid diagrams as an **editable** Miro board, or wants to
  edit / collaborate on the diagrams after generating them.
- The user invokes `/build-miro-board` and the project has no `tools/mermaid-to-miro/` yet.
- The user asks to "set up the mermaid-to-miro tool" or "get my diagrams into Miro".

## When NOT to use

- The user wants a static image (PNG/SVG) of a diagram — use a Mermaid renderer.
- The project already has `tools/mermaid-to-miro/` — just run its `/build-miro-board`.
- The diagrams aren't Mermaid flowcharts (this targets `flowchart`/`graph`; other
  Mermaid types parse loosely).

## Installation flow (first run on a project)

### Step 1 — Copy the template into the project

Copy the engine into `tools/mermaid-to-miro/` and the slash command into
`.claude/commands/`. The skill's files live in its own `template/` directory
(use this skill's base directory, shown when the skill is invoked):

```bash
SKILL_DIR="<this skill's base directory>"      # contains template/
PROJECT_ROOT="$(pwd)"

mkdir -p "$PROJECT_ROOT/tools/mermaid-to-miro" "$PROJECT_ROOT/.claude/commands"
cp "$SKILL_DIR"/template/*.mjs "$PROJECT_ROOT/tools/mermaid-to-miro/"
cp "$SKILL_DIR"/template/{package.json,.gitignore,SETUP.md} "$PROJECT_ROOT/tools/mermaid-to-miro/"
cp "$SKILL_DIR"/template/.claude/commands/build-miro-board.md "$PROJECT_ROOT/.claude/commands/"
```

### Step 2 — Install dependencies

```bash
cd "$PROJECT_ROOT/tools/mermaid-to-miro" && npm install   # Node 18+
```

### Step 3 — Miro token (one-time)

Point the user at `tools/mermaid-to-miro/SETUP.md`. They create a Miro app with
`boards:read`+`boards:write`, **install it into their normal workspace team (not
the "Developer team", or boards get a watermark)**, copy the token, and provide it
as `MIRO_TOKEN` env var or in the gitignored `tools/mermaid-to-miro/.miro_token`.
**Never print or commit the token.**

### Step 4 — Build

```bash
cd "$PROJECT_ROOT/tools/mermaid-to-miro"
node build-board.mjs <path-to-diagrams-folder>      # whole folder
# or
node convert-one.mjs <path-to-one-diagram.md>       # a single diagram
```

Each run **creates a fresh board** (non-destructive) and prints `BOARD_URL=…`.
`open` the URL for the user.

### Step 5 — Confirm install

Tell the user:
- The tool lives at `tools/mermaid-to-miro/`; setup guide at its `SETUP.md`.
- The `/build-miro-board` slash command is available next session.
- Everything on the board is editable; layout is automatic (dagre), so manual
  polish is a Miro-side pass.

## Customising per project

The tool is scaffolded *into* the project so it can be tailored:

- **Grouping / storyline:** edit `SECTIONS` in `build-board.mjs` — group diagrams
  into titled frames each with a plain-language description panel (leave `null`
  for an auto-grid of one-frame-per-diagram). Set `BOARD_TITLE` too.
- **Legend, palette, what the symbols mean:** edit `visual-language.mjs`.
- **How `classDef`/`style` becomes a Miro style:** edit `style.mjs`.
- Write labels for the **actual audience** — plain language, no jargon, if the
  board is going in front of non-engineers.

## How it works (engine)

`parse.mjs` (Mermaid → graph) → `layout.mjs` (dagre compound layout → coordinates
+ subgraph boxes) → `style.mjs` (`classDef`/`style` → Miro styles) → `render.mjs`
(shapes + elbowed connectors + grouping) + `legend.mjs` (key) → `miro.mjs` (REST
v2 client with rate-limit + retry). `build-board.mjs` orchestrates a folder;
`convert-one.mjs` does a single diagram.

## Security posture

- **No credentials in this skill or any project copy.** The token is the user's,
  provided via env var or a gitignored file, and should be **revoked after use**.
- The scripts only **create** boards (never read or modify existing ones), and
  print nothing sensitive. Redact `Bearer …` in any surfaced output.

## Iteration loop

Boards are cheap to regenerate: **edit the Mermaid (or `build-board.mjs` config),
re-run**. Don't hand-edit a board you plan to regenerate — those edits are lost on
the next run. For a board people will keep editing by hand, generate once and
treat Miro as the new home.
