// Convert a single diagram .md (or .mmd) into its own new Miro board. For testing.
// Usage: node convert-one.mjs <path-to-diagram.md>
import fs from 'node:fs';
import path from 'node:path';
import { parseMermaid } from './parse.mjs';
import { layoutGraph } from './layout.mjs';
import { renderDiagram } from './render.mjs';
import { Miro, loadToken } from './miro.mjs';

const file = process.argv[2];
if (!file) { console.error('usage: node convert-one.mjs <diagram.md>'); process.exit(1); }
const raw = fs.readFileSync(file, 'utf8');
const mm = raw.match(/```mermaid\n([\s\S]*?)```/);
const src = mm ? mm[1] : raw;
const id = path.basename(file).replace(/\.(md|mmd)$/, '');

const parsed = parseMermaid(src);
const layout = layoutGraph(parsed);
console.log(`parsed ${id}: ${parsed.nodes.length} nodes, ${parsed.subgraphs.length} subgraphs, ${parsed.edges.length} edges; layout ${Math.round(layout.width)}x${Math.round(layout.height)}`);

const miro = new Miro(loadToken());
const board = await miro.createBoard(`m2m one: ${id}`, `Single-diagram test of ${id}`);
console.log('BOARD_URL=' + (board.viewLink || `https://miro.com/app/board/${board.id}`));
const f = await renderDiagram(miro, board.id, parsed, layout, { x: 0, y: 0, title: id });
console.log(`rendered frame ${f.w}x${f.h}`);
console.log('OPEN=' + (board.viewLink || `https://miro.com/app/board/${board.id}`));
