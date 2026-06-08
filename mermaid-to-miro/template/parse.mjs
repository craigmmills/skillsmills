// Mermaid flowchart parser tuned to this repo's diagrams.
// Handles: flowchart/graph TB|LR|..., subgraphs (nested), node defs with
// shapes ["..."] ("...") {"..."} [("...")] >"...", edges --> -.-> <--> --- -.- ==>
// with optional |label|, classDef / class / style.
// Returns { direction, nodes, edges, subgraphs, classDefs, idStyles }.

const EDGE_OPS = [
  { re: /<-->/, type: 'biarrow' },
  { re: /-\.->/, type: 'dashed' },
  { re: /==>/, type: 'thick' },
  { re: /-->/, type: 'arrow' },
  { re: /-\.-/, type: 'dashedline' },
  { re: /---/, type: 'line' },
];
// longest-first operator alternation for splitting
const OP_SPLIT = /(<-->|-\.->|==>|-->|-\.-|---)/;

function stripQuotes(s) {
  s = s.trim();
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    return s.slice(1, -1);
  }
  return s;
}

// parse a single endpoint chunk like  id["Label"]  or  id  or  id(["x"])  or id:::cls
function parseEndpoint(chunk, ctx) {
  chunk = chunk.trim();
  if (!chunk) return null;
  // strip inline class  id:::cls
  let inlineClass = null;
  const cm = chunk.match(/:::([A-Za-z0-9_]+)\s*$/);
  if (cm) { inlineClass = cm[1]; chunk = chunk.slice(0, cm.index).trim(); }

  const m = chunk.match(/^([A-Za-z0-9_]+)\s*(.*)$/s);
  if (!m) return null;
  const id = m[1];
  let rest = m[2].trim();
  let shape = null, label = null;
  if (rest) {
    let inner = null;
    if (rest.startsWith('[(') && rest.endsWith(')]')) { shape = 'cylinder'; inner = rest.slice(2, -2); }
    else if (rest.startsWith('([') && rest.endsWith('])')) { shape = 'round'; inner = rest.slice(2, -2); }
    else if (rest.startsWith('[[') && rest.endsWith(']]')) { shape = 'rect'; inner = rest.slice(2, -2); }
    else if (rest.startsWith('{{') && rest.endsWith('}}')) { shape = 'hexagon'; inner = rest.slice(2, -2); }
    else if (rest.startsWith('[') && rest.endsWith(']')) { shape = 'rect'; inner = rest.slice(1, -1); }
    else if (rest.startsWith('(') && rest.endsWith(')')) { shape = 'round'; inner = rest.slice(1, -1); }
    else if (rest.startsWith('{') && rest.endsWith('}')) { shape = 'rhombus'; inner = rest.slice(1, -1); }
    else if (rest.startsWith('>') && rest.endsWith(']')) { shape = 'flag'; inner = rest.slice(1, -1); }
    if (inner != null) label = stripQuotes(inner);
  }
  ensureNode(ctx, id, { shape, label, inlineClass });
  return id;
}

function ensureNode(ctx, id, { shape, label, inlineClass } = {}) {
  if (ctx.subgraphIds.has(id)) {
    // referenced subgraph as an endpoint; not a node
    return;
  }
  let n = ctx.nodeMap.get(id);
  if (!n) {
    n = { id, shape: shape || 'rect', label: label != null ? label : id, classes: [], parent: ctx.stack.length ? ctx.stack[ctx.stack.length - 1] : null };
    ctx.nodeMap.set(id, n);
    ctx.nodes.push(n);
  } else {
    if (shape) n.shape = shape;
    if (label != null) n.label = label;
  }
  if (inlineClass) n.classes.push(inlineClass);
}

function parseStyleString(s) {
  const out = {};
  s.split(',').forEach(pair => {
    const i = pair.indexOf(':');
    if (i === -1) return;
    const k = pair.slice(0, i).trim();
    const v = pair.slice(i + 1).trim();
    if (k) out[k] = v;
  });
  return out;
}

export function parseMermaid(src) {
  // strip code fence if present
  src = src.replace(/^```mermaid\s*/i, '').replace(/```\s*$/i, '');
  const lines = src.split('\n');
  const ctx = {
    nodes: [], nodeMap: new Map(), edges: [], subgraphs: [], subgraphMap: new Map(),
    subgraphIds: new Set(), classDefs: {}, idStyles: {}, stack: [], direction: 'TB',
  };
  let sgCounter = 0;

  // First pass: discover subgraph ids so endpoints referencing them resolve correctly
  for (const raw of lines) {
    const t = raw.trim();
    const sm = t.match(/^subgraph\s+(.*)$/);
    if (sm) {
      const decl = sm[1].trim();
      const idm = decl.match(/^([A-Za-z0-9_]+)/);
      if (idm && !/^["'\[]/.test(decl)) ctx.subgraphIds.add(idm[1]);
    }
  }

  for (let raw of lines) {
    let line = raw.replace(/%%.*$/, '').trim(); // strip comments
    if (!line) continue;

    const head = line.match(/^(?:flowchart|graph)\s+(TB|TD|BT|LR|RL)\b/);
    if (head) { ctx.direction = head[1] === 'TD' ? 'TB' : head[1]; continue; }

    if (/^direction\s+/.test(line)) {
      const d = line.split(/\s+/)[1];
      if (ctx.stack.length) ctx.subgraphMap.get(ctx.stack[ctx.stack.length - 1]).direction = d;
      continue;
    }

    const sm = line.match(/^subgraph\s+(.*)$/);
    if (sm) {
      let decl = sm[1].trim();
      let id, label;
      const withBracket = decl.match(/^([A-Za-z0-9_]+)\s*(\[.*\]|\(.*\)|".*")$/);
      if (withBracket) {
        id = withBracket[1];
        let lab = withBracket[2];
        if (lab.startsWith('[') || lab.startsWith('(')) lab = lab.slice(1, -1);
        label = stripQuotes(lab);
      } else if (/^["']/.test(decl)) {
        id = `sg_${++sgCounter}`; label = stripQuotes(decl);
      } else {
        id = decl.split(/\s+/)[0] || `sg_${++sgCounter}`; label = id;
      }
      const parent = ctx.stack.length ? ctx.stack[ctx.stack.length - 1] : null;
      const sg = { id, label, parent, children: [], direction: null };
      ctx.subgraphMap.set(id, sg);
      ctx.subgraphs.push(sg);
      ctx.subgraphIds.add(id);
      if (parent) ctx.subgraphMap.get(parent).children.push(id);
      ctx.stack.push(id);
      continue;
    }
    if (line === 'end') { ctx.stack.pop(); continue; }

    if (/^classDef\s+/.test(line)) {
      const m = line.match(/^classDef\s+([A-Za-z0-9_,]+)\s+(.*)$/);
      if (m) { const st = parseStyleString(m[2]); m[1].split(',').forEach(nm => ctx.classDefs[nm] = st); }
      continue;
    }
    if (/^class\s+/.test(line)) {
      const m = line.match(/^class\s+([A-Za-z0-9_,\s]+?)\s+([A-Za-z0-9_]+)\s*$/);
      if (m) {
        const cls = m[2];
        m[1].split(',').map(s => s.trim()).filter(Boolean).forEach(id => {
          const n = ctx.nodeMap.get(id); if (n) n.classes.push(cls);
        });
      }
      continue;
    }
    if (/^style\s+/.test(line)) {
      const m = line.match(/^style\s+([A-Za-z0-9_]+)\s+(.*)$/);
      if (m) ctx.idStyles[m[1]] = parseStyleString(m[2]);
      continue;
    }
    if (/^linkStyle\b/.test(line)) continue;

    // edge / node line
    if (OP_SPLIT.test(line)) {
      // split into endpoint chunks and operator+label tokens
      const tokens = line.split(/(<-->|-\.->|==>|-->|-\.-|---)/);
      // tokens: [ep0, op, ep1, op, ep2, ...]  (ops may carry trailing |label|)
      const endpoints = [];
      const ops = [];
      for (let i = 0; i < tokens.length; i++) {
        if (i % 2 === 0) endpoints.push(tokens[i]);
        else ops.push(tokens[i]);
      }
      // a label |...| sits at the start of the following endpoint chunk
      const ids = [];
      for (let i = 0; i < endpoints.length; i++) {
        let chunk = endpoints[i];
        let label = null;
        const lm = chunk.match(/^\s*\|([^|]*)\|\s*(.*)$/s);
        if (lm) { label = stripQuotes(lm[1]); chunk = lm[2]; }
        const id = parseEndpoint(chunk, ctx);
        ids.push({ id, edgeLabel: label });
      }
      const OP_TYPE = { '<-->': 'biarrow', '-.->': 'dashed', '==>': 'thick', '-->': 'arrow', '-.-': 'dashedline', '---': 'line' };
      for (let i = 0; i < ops.length; i++) {
        const type = OP_TYPE[ops[i]] || 'arrow';
        const from = ids[i].id;
        const to = ids[i + 1].id;
        const label = ids[i + 1].edgeLabel;
        if (from && to) ctx.edges.push({ from, to, type, label });
      }
    } else {
      // standalone node definition(s)
      parseEndpoint(line, ctx);
    }
  }

  // assign membership lists onto subgraphs from node.parent and nested subgraph parents
  ctx.nodes.forEach(n => { if (n.parent && ctx.subgraphMap.has(n.parent)) ctx.subgraphMap.get(n.parent).children.push(n.id); });

  return {
    direction: ctx.direction,
    nodes: ctx.nodes,
    edges: ctx.edges,
    subgraphs: ctx.subgraphs,
    subgraphIds: ctx.subgraphIds,
    classDefs: ctx.classDefs,
    idStyles: ctx.idStyles,
  };
}
