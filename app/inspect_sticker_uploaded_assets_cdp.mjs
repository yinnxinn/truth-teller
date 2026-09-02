const pages = await (await fetch('http://127.0.0.1:9222/json')).json();
const page = pages.find(p => /mp\.weixin\.qq\.com/.test(p.url || '') && /createType=8/.test(p.url || ''));
if (!page) throw new Error('No active sticker editor found');
class Tab {
  constructor(url) { this.url = url; this.id = 0; this.pending = new Map(); }
  async connect() { this.ws = new WebSocket(this.url); this.ws.addEventListener('message', e => { const m = JSON.parse(e.data); const p = this.pending.get(m.id); if (p) { clearTimeout(p.timer); this.pending.delete(m.id); p.resolve(m); } }); await new Promise((resolve, reject) => { this.ws.addEventListener('open', resolve, { once: true }); this.ws.addEventListener('error', reject, { once: true }); }); }
  cmd(method, params = {}) { const id = ++this.id; return new Promise((resolve, reject) => { const timer = setTimeout(() => reject(new Error(method + ' timeout')), 30000); this.pending.set(id, { resolve, timer }); this.ws.send(JSON.stringify({ id, method, params })); }); }
  async eval(expression) { return (await this.cmd('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })).result?.result?.value; }
}
const tab = new Tab(page.webSocketDebuggerUrl); await tab.connect();
try {
  const state = await tab.eval(`(() => {
    const zone = document.querySelector('.image-selector');
    const all = Array.from(zone?.querySelectorAll('*') || []);
    return {
      text: (zone?.innerText || '').replace(/\\s+/g, ' '),
      mmbizImages: all.filter(x => x.tagName === 'IMG' && x.src.includes('mmbiz.qpic.cn')).map(x => x.outerHTML.slice(0,500)),
      backgrounds: all.filter(x => (x.getAttribute('style') || '').includes('mmbiz.qpic.cn')).map(x => x.outerHTML.slice(0,1000)),
      assetCandidates: all.filter(x => /image-selector__|image-item|image-list|image-preview/.test(String(x.className || ''))).map(x => ({ tag:x.tagName, cls:String(x.className || ''), text:(x.innerText || '').slice(0,80), outer:x.outerHTML.slice(0,800) })).slice(0,40)
    };
  })()`);
  console.log(JSON.stringify(state, null, 2));
} finally { tab.ws.close(); }
