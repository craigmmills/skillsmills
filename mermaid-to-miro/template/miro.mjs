// Minimal Miro REST v2 client with rate-limit handling.
import fs from 'node:fs';

export function loadToken() {
  if (process.env.MIRO_TOKEN) return process.env.MIRO_TOKEN.trim();
  for (const p of ['./.miro_token', new URL('./.miro_token', import.meta.url).pathname]) {
    try { return fs.readFileSync(p, 'utf8').trim(); } catch {}
  }
  throw new Error('No Miro token: set MIRO_TOKEN or create tools/mermaid-to-miro/.miro_token');
}

const API = 'https://api.miro.com/v2';
const sleep = ms => new Promise(r => setTimeout(r, ms));

export class Miro {
  constructor(token, { pace = 120 } = {}) { this.h = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', Accept: 'application/json' }; this.pace = pace; }

  async req(method, path, body, attempt = 0) {
    const r = await fetch(API + path, { method, headers: this.h, body: body ? JSON.stringify(body) : undefined });
    if (r.status === 429 || r.status >= 500) {
      if (attempt < 6) {
        const ra = parseFloat(r.headers.get('retry-after')) || (1.5 * (attempt + 1));
        await sleep(ra * 1000);
        return this.req(method, path, body, attempt + 1);
      }
    }
    const txt = await r.text();
    if (!r.ok) throw new Error(`${method} ${path} -> ${r.status}: ${txt.slice(0, 400)}`);
    await sleep(this.pace);
    return txt ? JSON.parse(txt) : {};
  }
  post(p, b) { return this.req('POST', p, b); }
  get(p) { return this.req('GET', p); }
  del(p) { return this.req('DELETE', p); }

  createBoard(name, description) { return this.post('/boards', { name, description }); }
  createFrame(bid, { title, x, y, w, h, fillColor = '#ffffff' }) {
    return this.post(`/boards/${bid}/frames`, { data: { title, format: 'custom', type: 'freeform' }, position: { x, y }, geometry: { width: w, height: h }, style: { fillColor } });
  }
  createShape(bid, { shape = 'rectangle', content, x, y, w, h, style, parent }) {
    const body = { data: { shape, content }, style, position: { x, y }, geometry: { width: w, height: h } };
    if (parent) body.parent = { id: parent };
    return this.post(`/boards/${bid}/shapes`, body);
  }
  createText(bid, { content, x, y, w, style, parent }) {
    const body = { data: { content }, style, position: { x, y }, geometry: { width: w } };
    if (parent) body.parent = { id: parent };
    return this.post(`/boards/${bid}/texts`, body);
  }
  createConnector(bid, { from, to, caption, style }) {
    const body = { startItem: { id: from }, endItem: { id: to }, shape: 'elbowed', style };
    if (caption) body.captions = [{ content: caption }];
    return this.post(`/boards/${bid}/connectors`, body);
  }
  createGroup(bid, items) { return this.post(`/boards/${bid}/groups`, { data: { items } }); }
}
