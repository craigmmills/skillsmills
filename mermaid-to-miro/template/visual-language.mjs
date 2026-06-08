// The codified visual language for the diagram set. The legend renders FROM
// this, and the renderer's conventions match it, so the key always reflects
// what's actually drawn. Meaning is carried redundantly (line style + marker +
// label), never by colour alone — print- and colour-blind-safe.
//
// These are sensible defaults for architecture / data-flow diagrams. Edit the
// wording to match your project's audience and conventions.

// Canonical palette (kept deliberately small: neutrals + one accent + amber).
export const PALETTE = {
  neutralFill: '#ffffff',
  neutralBorder: '#9e9e9e',
  zoneFill: '#fbfbfb',
  zoneBorder: '#cccccc',
  sotFill: '#e9eef3',   // steel — colour-blind-safe anchor
  sotBorder: '#1a1a1a',
  riskFill: '#fff4e5',
  riskBorder: '#c77700',
  text: '#1a1a1a',
};

// Connector semantics — keyed by the edge `type` the parser produces, so the
// legend samples use the exact same connectorStyle() as the diagrams.
export const LINE_LEGEND = [
  { type: 'arrow', label: 'Flows this way', desc: 'a solid arrow shows the direction things move' },
  { type: 'dashed', label: 'Planned or a note', desc: 'a dashed line is a future step, or a side note' },
  { type: 'biarrow', label: 'Two-way', desc: 'goes both directions' },
  { type: 'thick', label: 'Read this first', desc: 'a thick arrow is the main path to follow' },
  { type: 'line', label: 'Just related', desc: 'connected, with no particular direction' },
];

// Node / container semantics — sample shapes drawn with these canonical styles.
export const BOX_LEGEND = [
  {
    content: '<p><b>◆ the original</b></p>', desc: 'a heavy outline with a ◆ marks the original / authoritative record',
    style: { fillColor: PALETTE.sotFill, borderColor: PALETTE.sotBorder, borderWidth: '3', borderStyle: 'normal', color: PALETTE.text, fontSize: '11', textAlign: 'center', textAlignVertical: 'middle' },
  },
  {
    content: '<p>a group</p>', desc: 'related boxes sit inside a bigger box together',
    style: { fillColor: PALETTE.zoneFill, borderColor: PALETTE.zoneBorder, borderWidth: '1', borderStyle: 'normal', color: '#555555', fontSize: '11', textAlign: 'center', textAlignVertical: 'middle' },
  },
  {
    content: '<p>dashed outline</p>', desc: 'a boundary — what one party owns or builds',
    style: { fillColor: '#ffffff', borderColor: '#333333', borderWidth: '2', borderStyle: 'dashed', color: '#555555', fontSize: '11', textAlign: 'center', textAlignVertical: 'middle' },
  },
  {
    content: '<p>⚠ a catch</p>', desc: 'an amber box flags a risk or caveat',
    style: { fillColor: PALETTE.riskFill, borderColor: PALETTE.riskBorder, borderWidth: '1', borderStyle: 'normal', color: PALETTE.text, fontSize: '11', textAlign: 'center', textAlignVertical: 'middle' },
  },
];

export const LEGEND_NOTE =
  'Meaning never depends on colour alone — the line style, the ◆ mark, and the words carry it too, so everything still makes sense in black-and-white or if you are colour-blind.';
