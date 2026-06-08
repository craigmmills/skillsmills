---
description: Turn this project's Mermaid diagrams into an editable Miro board (one frame per diagram or grouped into titled sections, with a legend). Optionally convert a single diagram. Source — tools/mermaid-to-miro/.
argument-hint: "[diagrams dir, or a single diagram .md]"
allowed-tools: Bash, Read
---

You are generating a Miro board from this project's Mermaid diagrams using the
`tools/mermaid-to-miro/` converter. Mermaid stays the source of truth; Miro is
the editable, collaborative surface. The converter parses Mermaid, lays it out
with dagre, maps `classDef`/`style` to Miro styles, and renders each diagram as a
titled frame (with grouped subgraph boxes), plus a shared legend frame.

Argument (`$ARGUMENTS`):
- **empty** → build the whole diagrams folder onto one new board (`build-board.mjs`).
- **a folder** → build that folder.
- **a single diagram `.md`/`.mmd`** → convert just that diagram (`convert-one.mjs`).

## Step 1 — Preconditions

- `cd tools/mermaid-to-miro`.
- If `node_modules/` is missing, run `npm install` (Node 18+).
- Ensure a Miro token with `boards:read`+`boards:write` is available as
  `MIRO_TOKEN` env var **or** in `tools/mermaid-to-miro/.miro_token` (gitignored).
  If neither exists, stop and point the user at `tools/mermaid-to-miro/SETUP.md`.
  **Never print the token**; redact `Bearer …` in any output you surface.

## Step 2 — Run

- Whole folder: `node build-board.mjs <diagramsDir>`
- Single: `node convert-one.mjs <path>`

Each run **creates a new board** and is non-destructive. The script prints
`BOARD_URL=…` and a per-diagram `✓/✗` summary; relay the URL and any failures.

## Step 3 — Report and offer

- Give the user the board URL and `open` it (`open "<url>"`).
- Note that everything is editable (drag shapes; elbowed connectors reflow), and
  that layout is auto (dagre), so manual polish is a Miro-side pass.
- Remind them to **revoke/rotate the token** if it was pasted into a transcript.

## Notes

- **Watermark:** if the board shows a big "Developer team" watermark, the token was
  installed into a Miro Developer team. Re-issue the token installed into a standard
  team (see SETUP.md) and re-run.
- **Grouping / storyline:** to group diagrams into titled sections with description
  panels, edit `SECTIONS` in `build-board.mjs` (leave `null` for an auto-grid).
- **Visual language / colours:** edit `visual-language.mjs`. **Want different
  *content*?** Fix the Mermaid source — it's canonical.
