# mermaid-to-miro — setup

Turns a folder of **Mermaid** diagrams into an **editable Miro board**: one frame
per diagram (or grouped into titled sections), with a legend and the boxes inside
each "bigger box" grouped so they move together. Layout is computed with **dagre**
(the same engine Mermaid uses); `classDef` / `style` declarations are mapped to
Miro styles, so your colours, borders, and dashed boundaries carry across.

Mermaid stays your source of truth; Miro is the editable, collaborative surface.

## 1. Node dependencies

```bash
cd tools/mermaid-to-miro
npm install            # installs @dagrejs/dagre (Node 18+, global fetch)
```

`node_modules/`, `.miro_token`, and `*.log` are gitignored.

## 2. Get a Miro access token

You need a token with **`boards:read` + `boards:write`**.

1. Log in to Miro → **https://miro.com/app/settings/user-profile/apps** (create a
   free *Developer team* if prompted).
2. **Create new app**, e.g. `mermaid-to-miro`.
3. Under **Permissions / Scopes**, tick `boards:read` and `boards:write`.
4. **"Install app and get OAuth token"** → **pick your normal workspace team, not
   the "Developer team"** → copy the token.

> ⚠️ If you install into the **Developer team**, every board gets a big
> non-removable **"Developer team" watermark**. Install into a standard team to
> avoid it.

Provide the token one of two ways:

```bash
export MIRO_TOKEN='paste-token-here'                 # preferred; not persisted
printf '%s' 'paste-token-here' > tools/mermaid-to-miro/.miro_token   # gitignored
```

Treat the token like a password and **rotate/revoke it when done**.

## 3. Run

```bash
# whole folder onto one new board
node build-board.mjs ../../path/to/your/diagrams

# a single diagram onto its own new board (handy for testing)
node convert-one.mjs ../../path/to/your/diagram.md
```

Each run **creates a fresh board** and prints `BOARD_URL=…`. The scripts never
edit an existing board, so re-running is safe.

## Customising

- **Board grouping / storyline:** edit `build-board.mjs` — set `SECTIONS` to group
  diagrams into titled frames with description panels (leave `null` for an
  auto-grid). Edit `BOARD_TITLE` too.
- **Legend, palette, and what the symbols mean:** edit `visual-language.mjs`.
- **How `classDef`/`style` maps to Miro:** edit `style.mjs`.
- The engine files (`parse`, `layout`, `render`, `miro`) rarely need touching.

## Files

| File | Role |
|---|---|
| `parse.mjs` | Mermaid flowchart parser (nodes, edges, subgraphs, classDef/style) |
| `layout.mjs` | dagre compound layout → coordinates + subgraph bounding boxes |
| `style.mjs` | `classDef`/`style` → Miro item styles; hex normalisation; shape map |
| `visual-language.mjs` | the codified palette + line/box meanings (the legend reads this) |
| `legend.mjs` | renders the legend frame using the same styles the diagrams use |
| `render.mjs` | a diagram → shapes + connectors + grouping (in a frame, or into one) |
| `miro.mjs` | Miro REST v2 client (rate-limit + retry) |
| `build-board.mjs` | orchestrator: a folder of diagrams → one board (auto-grid or sections) |
| `convert-one.mjs` | single diagram → its own board |
