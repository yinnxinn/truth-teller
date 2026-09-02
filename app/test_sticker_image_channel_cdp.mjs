import path from 'node:path';

const testImage = path.resolve('D:/wechat/content/drafts/2026-08-29-sticker-chrome-workbench/images/01-workbench-cover.jpg');
const pages = await (await fetch('http://127.0.0.1:9222/json')).json();
const page = pages.find(p => /mp\.weixin\.qq\.com/.test(p.url || '') && /createType=8/.test(p.url || ''));
if (!page) throw new Error('No blank sticker editor found');
class Tab {
  constructor(url) { this.url = url; this.id = 0; this.pending = new Map(); }
  async connect() { this.ws = new WebSocket(this.url); this.ws.addEventListener('message', e => { const m = JSON.parse(e.data); const p = this.pending.get(m.id); if (p) { clearTimeout(p.timer); this.pending.delete(m.id); p.resolve(m); } }); await new Promise((resolve, reject) => { this.ws.addEventListener('open', resolve, { once: true }); this.ws.addEventListener('error', reject, { once: true }); }); }
  cmd(method, params = {}, timeout = 60000) { const id = ++this.id; return new Promise((resolve, reject) => { const timer = setTimeout(() => { this.pending.delete(id); reject(new Error(method + ' timeout')); }, timeout); this.pending.set(id, { resolve, timer }); this.ws.send(JSON.stringify({ id, method, params })); }); }
  async eval(expression) { return (await this.cmd('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })).result?.result?.value; }
}
const tab = new Tab(page.webSocketDebuggerUrl); await tab.connect();
try {
  const doc = await tab.cmd('DOM.getDocument', { depth: 1 });
  const input = await tab.cmd('DOM.querySelector', { nodeId: doc.result.root.nodeId, selector: '.image-selector input[type=file]' });
  if (!input.result.nodeId) throw new Error('Sticker image-selector input not found');
  await tab.cmd('DOM.setFileInputFiles', { nodeId: input.result.nodeId, files: [testImage] }, 120000);
  await new Promise(resolve => setTimeout(resolve, 8000));
  const result = await tab.eval(`(() => {
    const zone = document.querySelector('.image-selector');
    return {
      zoneText: (zone?.innerText || '').replace(/\\s+/g, ' ').slice(0,500),
      zoneImages: zone ? Array.from(zone.querySelectorAll('img')).map(x => x.src.slice(0,160)) : [],
      bodyUploadedImages: document.querySelectorAll('div.ProseMirror[style*="min-height"] img[data-upload="1"]').length
    };
  })()`);
  console.log(JSON.stringify(result, null, 2));
} finally { tab.ws.close(); }
