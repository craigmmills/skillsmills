// Render a parsed+laid-out diagram into Miro.
// - placeDiagram(): draws the diagram's shapes/connectors as children of a given
//   parent frame at an (ox,oy) offset, and groups each subgraph box with its
//   inner boxes. Returns the itemId map. Used by section frames (build-board).
// - renderDiagram(): wraps placeDiagram in its own frame with a title + subtitle.
//   Used for single-diagram boards (convert-one).
import { nodeStyle, subgraphStyle, connectorStyle, toContent, miroShape } from './style.mjs';

export const PAD = 24;
export const SUBTITLE_H = 64;

export function contentSize(layout) { return { w: layout.width, h: layout.height }; }
export function frameSize(layout) {
  return { w: Math.max(260, layout.width + PAD * 2), h: Math.max(180, layout.height + PAD * 2 + SUBTITLE_H) };
}

function depth(sg, sgMap) { let d = 0, p = sg.parent; while (p && sgMap.has(p)) { d++; p = sgMap.get(p).parent; } return d; }

// Draw the diagram's items as children of parentId, offset by (ox,oy) from the
// parent frame's top-left. Returns { itemId }.
export async function placeDiagram(miro, bid, parsed, layout, { parentId, ox, oy }) {
  const itemId = {};
  const sgMap = new Map(parsed.subgraphs.map(s => [s.id, s]));
  const ordered = parsed.subgraphs.slice().sort((a, b) => depth(a, sgMap) - depth(b, sgMap));
  for (const sg of ordered) {
    const L = layout.subgraphs[sg.id];
    if (!L) continue;
    const res = await miro.createShape(bid, { shape: 'rectangle', content: toContent(sg.label), x: L.x + ox, y: L.y + oy, w: L.w, h: L.h, style: subgraphStyle(sg, parsed.idStyles), parent: parentId });
    itemId[sg.id] = res.id;
  }
  for (const n of parsed.nodes) {
    const L = layout.nodes[n.id];
    if (!L) continue;
    const isHome = n.classes.includes('home') || /ORIGINAL RECORD|SOURCE OF TRUTH/i.test(n.label);
    const res = await miro.createShape(bid, { shape: miroShape(n.shape), content: toContent(n.label, { bold: isHome }), x: L.x + ox, y: L.y + oy, w: L.w, h: L.h, style: nodeStyle(n, parsed.classDefs, parsed.idStyles), parent: parentId });
    itemId[n.id] = res.id;
  }
  for (const e of parsed.edges) {
    const from = itemId[e.from], to = itemId[e.to];
    if (!from || !to) continue;
    await miro.createConnector(bid, { from, to, caption: e.label || undefined, style: connectorStyle(e.type) });
  }
  // group each subgraph box with its direct child boxes (innermost-first)
  const grouped = new Set();
  for (const sg of parsed.subgraphs.slice().sort((a, b) => depth(b, sgMap) - depth(a, sgMap))) {
    const rect = itemId[sg.id];
    if (!rect) continue;
    const members = [rect];
    for (const n of parsed.nodes) if (n.parent === sg.id && itemId[n.id]) members.push(itemId[n.id]);
    for (const c of parsed.subgraphs) if (c.parent === sg.id && itemId[c.id]) members.push(itemId[c.id]);
    const fresh = members.filter(id => !grouped.has(id));
    if (fresh.length >= 2) { try { await miro.createGroup(bid, fresh); fresh.forEach(id => grouped.add(id)); } catch {} }
  }
  return { itemId };
}

// Single diagram in its own frame (title + one-line subtitle). For convert-one.
export async function renderDiagram(miro, bid, parsed, layout, { x, y, title, subtitle }) {
  const { w, h } = frameSize(layout);
  const frame = await miro.createFrame(bid, { title, x, y, w, h, fillColor: '#ffffff' });
  if (subtitle) await miro.createText(bid, { content: `<p>${subtitle}</p>`, x: w / 2, y: 30, w: w - PAD * 2, style: { fontSize: '14', color: '#555555', textAlign: 'left' }, parent: frame.id });
  await placeDiagram(miro, bid, parsed, layout, { parentId: frame.id, ox: PAD, oy: PAD + SUBTITLE_H });
  return { id: frame.id, w, h };
}
