// Render a legend / key frame, using the same connector + box styles the
// diagrams use (imported from style.mjs / visual-language.mjs).
import { connectorStyle } from './style.mjs';
import { LINE_LEGEND, BOX_LEGEND, LEGEND_NOTE } from './visual-language.mjs';

const W = 600;
const ROW = 56;

export async function renderLegend(miro, bid, { x, y }) {
  const lineTop = 86;
  const boxTop = lineTop + LINE_LEGEND.length * ROW + 30;
  const noteTop = boxTop + BOX_LEGEND.length * ROW + 16;
  const H = noteTop + 110;

  const frame = await miro.createFrame(bid, { title: 'How to read these diagrams', x, y, w: W, h: H, fillColor: '#fafaf6' });
  const fid = frame.id;
  const T = (content, cx, cy, w, fontSize = '14', color = '#1a1a1a', textAlign = 'left') =>
    miro.createText(bid, { content, x: cx, y: cy, w, style: { fontSize, color, textAlign }, parent: fid });

  await T('<p><b>Lines and arrows</b></p>', 30, 60, 240, '15', '#23425e');
  for (let i = 0; i < LINE_LEGEND.length; i++) {
    const e = LINE_LEGEND[i];
    const cy = lineTop + i * ROW + 24;
    const a = await miro.createShape(bid, { shape: 'circle', content: ' ', x: 50, y: cy, w: 10, h: 10, style: { fillColor: '#333333', borderColor: '#333333', borderWidth: '1' }, parent: fid });
    const b = await miro.createShape(bid, { shape: 'circle', content: ' ', x: 150, y: cy, w: 10, h: 10, style: { fillColor: '#333333', borderColor: '#333333', borderWidth: '1' }, parent: fid });
    await miro.createConnector(bid, { from: a.id, to: b.id, style: connectorStyle(e.type) });
    await T(`<p><b>${e.label}</b> — ${e.desc}</p>`, 320, cy, 320, '13');
  }

  await T('<p><b>Boxes</b></p>', 30, boxTop - 26, 240, '15', '#23425e');
  for (let i = 0; i < BOX_LEGEND.length; i++) {
    const e = BOX_LEGEND[i];
    const cy = boxTop + i * ROW + 24;
    await miro.createShape(bid, { shape: 'rectangle', content: e.content, x: 110, y: cy, w: 150, h: 38, style: e.style, parent: fid });
    await T(`<p>${e.desc}</p>`, 360, cy, 240, '13');
  }

  await T(`<p>${LEGEND_NOTE}</p>`, W / 2, noteTop + 44, W - 60, '12', '#555555', 'left');
  return { id: fid, w: W, h: H };
}
