// Build ONE Miro board from a folder of Mermaid diagrams.
//
// Two modes:
//   • AUTO (default): every .md / .mmd in the folder becomes its own titled
//     frame, packed into a grid, with a legend top-left.
//   • SECTIONED: set SECTIONS below to group diagrams into titled frames, each
//     with a plain-English description panel beside it.
//
// This file is yours to customise per project — edit BOARD_TITLE, SECTIONS, and
// the legend wording (in visual-language.mjs). The engine (parse/layout/style/
// render/legend/miro) stays untouched.
//
// Usage: node build-board.mjs [diagramsDir]   (env MIRO_TOKEN or ./.miro_token)
import fs from 'node:fs';
import path from 'node:path';
import { parseMermaid } from './parse.mjs';
import { layoutGraph } from './layout.mjs';
import { renderDiagram, placeDiagram, frameSize, contentSize } from './render.mjs';
import { renderLegend } from './legend.mjs';
import { Miro, loadToken } from './miro.mjs';

// ---------------------------------------------------------------------------
// CUSTOMISE HERE
const BOARD_TITLE = 'Diagrams (Mermaid → Miro)';
const BOARD_SUBTITLE = 'generated from Mermaid sources — editable in Miro';

// Leave null to auto-discover every diagram into a grid. Or define sections:
//   const SECTIONS = [
//     { title: 'Context', description: '<p>What this group is for.</p>', ids: ['overview', 'data-model'] },
//     { title: 'Flows',   description: '<p>How data moves.</p>',        ids: ['flow-a', 'flow-b'] },
//   ];
// `ids` match a diagram filename without extension, or its leading `id-` prefix.
const SECTIONS = null;

const GRID_COLS = 4;        // AUTO mode: frames per row
const GAP = 160;            // gap between frames / columns
const SECTION_GAP = 220;    // gap between section frames
const DESC_W = 420, DESC_GAP = 90, IN_PAD = 36, TITLE_H = 40;
// ---------------------------------------------------------------------------

const DIR = process.argv[2] || (fs.existsSync('./diagrams') ? './diagrams' : '.');
const files = fs.readdirSync(DIR).filter(f => /\.(md|mmd)$/.test(f) && f.toLowerCase() !== 'readme.md');
const h1 = src => ((src.match(/^#\s+(.+)$/m) || [, null])[1] || '').trim();
const mermaidOf = raw => { const m = raw.match(/```mermaid\n([\s\S]*?)```/); return m ? m[1] : raw; };
const findFile = id => files.find(f => f === id + '.md' || f === id + '.mmd' || f.startsWith(id + '-'));

function load(file) {
  const raw = fs.readFileSync(path.join(DIR, file), 'utf8');
  const id = file.replace(/\.(md|mmd)$/, '');
  const parsed = parseMermaid(mermaidOf(raw));
  const layout = layoutGraph(parsed);
  return { id, title: h1(raw) || id, parsed, layout };
}

const miro = new Miro(loadToken(), { pace: 110 });
const board = await miro.createBoard(BOARD_TITLE, BOARD_SUBTITLE);
const bid = board.id;
const url = board.viewLink || `https://miro.com/app/board/${bid}`;
console.log('BOARD_URL=' + url);

await miro.createText(bid, { content: `<p><b>${BOARD_TITLE}</b><br>${BOARD_SUBTITLE}</p>`, x: 600, y: -180, w: 1100, style: { fontSize: '38', color: '#1a1a1a' } });
const legend = await renderLegend(miro, bid, { x: 320, y: 60 });
console.log('  ✓ legend');

let ok = 0, fail = 0;

if (!SECTIONS) {
  // AUTO: one frame per diagram, grid-packed below the legend
  const items = files.map(load);
  let cursorY = legend.h + GAP, col = 0, rowH = 0, cursorX = 0;
  for (const it of items) {
    const { w, h } = frameSize(it.layout);
    if (col === GRID_COLS) { cursorY += rowH + GAP; col = 0; cursorX = 0; rowH = 0; }
    try {
      await renderDiagram(miro, bid, it.parsed, it.layout, { x: cursorX + w / 2, y: cursorY + h / 2, title: it.title });
      ok++; console.log(`  ✓ ${it.id}`);
    } catch (e) { fail++; console.warn(`  ✗ ${it.id}: ${e.message}`); }
    cursorX += w + GAP; rowH = Math.max(rowH, h); col++;
  }
} else {
  // SECTIONED: a frame per section, diagrams in a row inside, description beside
  const FRAME_LEFT = DESC_W + DESC_GAP;
  let cursorY = legend.h + SECTION_GAP;
  for (const s of SECTIONS) {
    const items = (s.ids || []).map(findFile).filter(Boolean).map(load);
    if (!items.length) continue;
    for (const it of items) { const c = contentSize(it.layout); it.cw = c.w; it.ch = c.h; }
    let cx = 0; for (const it of items) { it._ox = IN_PAD + cx; cx += it.cw + GAP; }
    const frameW = IN_PAD * 2 + (cx - GAP);
    const maxCh = Math.max(...items.map(i => i.ch));
    const frameH = IN_PAD + TITLE_H + maxCh + IN_PAD;
    const top = cursorY;
    const frame = await miro.createFrame(bid, { title: s.title, x: FRAME_LEFT + frameW / 2, y: top + frameH / 2, w: frameW, h: frameH, fillColor: '#fcfcfc' });
    if (s.description) await miro.createText(bid, { content: s.description, x: DESC_W / 2, y: top + frameH / 2, w: DESC_W, style: { fontSize: '16', color: '#333333', textAlign: 'left' } });
    const CARD_PAD = 18;
    for (const it of items) {
      try {
        await miro.createShape(bid, { shape: 'rectangle', content: ' ', x: it._ox + it.cw / 2, y: IN_PAD + (TITLE_H + it.ch) / 2, w: it.cw + CARD_PAD * 2, h: TITLE_H + it.ch + CARD_PAD * 2, style: { fillColor: '#ffffff', borderColor: '#d0d0d0', borderWidth: '1', borderStyle: 'normal' }, parent: frame.id });
        await miro.createText(bid, { content: `<p><b>${it.title}</b></p>`, x: it._ox + it.cw / 2, y: IN_PAD + TITLE_H / 2, w: it.cw, style: { fontSize: '18', color: '#1a1a1a', textAlign: 'center' }, parent: frame.id });
        await placeDiagram(miro, bid, it.parsed, it.layout, { parentId: frame.id, ox: it._ox, oy: IN_PAD + TITLE_H });
        ok++; console.log(`  ✓ ${it.id}`);
      } catch (e) { fail++; console.warn(`  ✗ ${it.id}: ${e.message}`); }
    }
    cursorY = top + frameH + SECTION_GAP;
  }
}

console.log(`DONE rendered=${ok} failed=${fail}`);
console.log('OPEN=' + url);
