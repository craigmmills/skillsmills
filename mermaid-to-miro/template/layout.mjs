// dagre compound layout for a parsed mermaid graph.
// Returns { nodes: {id:{x,y,w,h}}, subgraphs: {id:{x,y,w,h}}, width, height }
// where x,y are CENTERS in a coordinate space starting near (0,0).
import dagre from '@dagrejs/dagre';

const stripHtml = s => String(s).replace(/<[^>]+>/g, '');

export function estimateSize(label) {
  const text = stripHtml(label || '');
  const lines = text.split(/<br>|\n/).length ? text.split('\n') : [text];
  const rawLines = String(label || '').replace(/<br\s*\/?>/gi, '\n').split('\n');
  const maxChars = Math.max(1, ...rawLines.map(l => stripHtml(l).length));
  const nLines = rawLines.length;
  const w = Math.max(120, Math.min(420, Math.round(maxChars * 7.2) + 28));
  const h = Math.max(44, nLines * 20 + 22);
  return { w, h };
}

// find a representative leaf node id for a subgraph (for routing edges that
// target a subgraph, since dagre dislikes edges to compound nodes)
function representative(sgId, sgMap, nodeParent, childrenOf) {
  const seen = new Set();
  const stack = [sgId];
  while (stack.length) {
    const cur = stack.pop();
    for (const c of childrenOf.get(cur) || []) {
      if (sgMap.has(c)) { if (!seen.has(c)) { seen.add(c); stack.push(c); } }
      else return c; // a node
    }
  }
  return null;
}

export function layoutGraph(parsed) {
  const { direction, nodes, edges, subgraphs, subgraphIds, idStyles } = parsed;
  const sgMap = new Map(subgraphs.map(s => [s.id, s]));
  const childrenOf = new Map(subgraphs.map(s => [s.id, s.children.slice()]));

  const g = new dagre.graphlib.Graph({ compound: true, multigraph: true });
  g.setGraph({ rankdir: direction || 'TB', nodesep: 45, ranksep: 65, marginx: 24, marginy: 24 });
  g.setDefaultEdgeLabel(() => ({}));

  for (const n of nodes) {
    const { w, h } = estimateSize(n.label);
    n._w = w; n._h = h;
    g.setNode(n.id, { width: w, height: h });
  }
  // compound parent nodes
  for (const s of subgraphs) g.setNode(s.id, { label: s.label });
  for (const n of nodes) if (n.parent && sgMap.has(n.parent)) g.setParent(n.id, n.parent);
  for (const s of subgraphs) if (s.parent && sgMap.has(s.parent)) g.setParent(s.id, s.parent);

  edges.forEach((e, i) => {
    let from = e.from, to = e.to;
    if (sgMap.has(from)) from = representative(from, sgMap, null, childrenOf) || from;
    if (sgMap.has(to)) to = representative(to, sgMap, null, childrenOf) || to;
    if (from && to && g.hasNode(from) && g.hasNode(to)) g.setEdge(from, to, {}, `e${i}`);
  });

  dagre.layout(g);

  const outNodes = {};
  for (const n of nodes) {
    const d = g.node(n.id);
    if (d) outNodes[n.id] = { x: d.x, y: d.y, w: n._w, h: n._h };
  }
  const outSg = {};
  const TITLE_PAD = 26;
  for (const s of subgraphs) {
    const d = g.node(s.id);
    if (d && d.width && d.height) {
      outSg[s.id] = { x: d.x, y: d.y - TITLE_PAD / 2, w: d.width + 16, h: d.height + TITLE_PAD };
    }
  }
  const gg = g.graph();
  return { nodes: outNodes, subgraphs: outSg, width: gg.width || 600, height: gg.height || 400, titlePad: TITLE_PAD };
}
