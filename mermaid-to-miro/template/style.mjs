// Map mermaid classDef/style declarations to Miro item styles.

const SHAPE_MAP = {
  rect: 'rectangle', round: 'round_rectangle', rhombus: 'rhombus',
  cylinder: 'can', hexagon: 'hexagon', flag: 'rectangle',
};
export const miroShape = s => SHAPE_MAP[s] || 'rectangle';

function normHex(c) {
  if (!c) return c;
  c = String(c).trim();
  const m = c.match(/^#([0-9a-fA-F]{3})$/);
  if (m) return '#' + m[1].split('').map(x => x + x).join('');
  return c;
}

function clampWidth(v) {
  const n = parseFloat(String(v).replace('px', ''));
  if (isNaN(n)) return undefined;
  return String(Math.max(1, Math.min(24, Math.round(n))));
}

// merge a list of mermaid style objects (later wins) into a Miro shape style
function toMiroStyle(merged, defaults) {
  const st = { ...defaults };
  if (merged.fill && merged.fill !== 'none') st.fillColor = normHex(merged.fill);
  if (merged.fill === 'none') st.fillColor = '#ffffff';
  if (merged.stroke) st.borderColor = normHex(merged.stroke);
  const bw = clampWidth(merged['stroke-width']);
  if (bw) st.borderWidth = bw;
  if (merged.color) st.color = normHex(merged.color);
  if (merged['stroke-dasharray']) st.borderStyle = 'dashed';
  return st;
}

export function nodeStyle(node, classDefs, idStyles) {
  const merged = {};
  for (const c of node.classes) Object.assign(merged, classDefs[c] || {});
  if (classDefs.default && node.classes.length === 0) Object.assign(merged, classDefs.default);
  if (idStyles[node.id]) Object.assign(merged, idStyles[node.id]);
  return toMiroStyle(merged, {
    fillColor: '#ffffff', borderColor: '#9e9e9e', borderWidth: '1', borderStyle: 'normal',
    color: '#1a1a1a', fontSize: '12', textAlign: 'center', textAlignVertical: 'middle',
  });
}

export function subgraphStyle(sg, idStyles) {
  const merged = idStyles[sg.id] ? { ...idStyles[sg.id] } : {};
  const st = toMiroStyle(merged, {
    fillColor: '#fbfbfb', borderColor: '#cccccc', borderWidth: '1', borderStyle: 'normal',
    color: '#555555', fontSize: '13', textAlign: 'left', textAlignVertical: 'top',
  });
  // subgraph fills should be light/transparent-ish so child nodes read on top
  if (!idStyles[sg.id]?.fill) st.fillColor = '#fbfbfb';
  return st;
}

export function connectorStyle(type) {
  const base = { strokeColor: '#333333', strokeWidth: '2', strokeStyle: 'normal', startStrokeCap: 'none', endStrokeCap: 'arrow' };
  switch (type) {
    case 'dashed': return { ...base, strokeStyle: 'dashed' };
    case 'biarrow': return { ...base, startStrokeCap: 'arrow' };
    case 'line': return { ...base, endStrokeCap: 'none' };
    case 'dashedline': return { ...base, strokeStyle: 'dashed', endStrokeCap: 'none' };
    case 'thick': return { ...base, strokeWidth: '4' };
    default: return base; // arrow
  }
}

// mermaid label -> Miro HTML content
export function toContent(label, { bold = false } = {}) {
  if (label == null) return ' ';
  let s = String(label)
    .replace(/<br\s*\/?>/gi, '<br>')
    .replace(/&(?!(amp|lt|gt|quot|#\d+);)/g, '&amp;');
  if (bold) s = `<b>${s}</b>`;
  return `<p>${s}</p>`;
}
