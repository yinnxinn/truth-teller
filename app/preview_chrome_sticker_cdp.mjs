const TARGET_ID = '100001209';
const pages = await (await fetch('http://127.0.0.1:9222/json')).json();
const page = pages.find(p => /mp\.weixin\.qq\.com/.test(p.url || '') && new RegExp('appmsgid=' + TARGET_ID).test(p.url || ''));
if (!page) throw new Error('Corrected sticker draft tab not found');
class Tab {
  constructor(url) { this.url = url; this.id = 0; this.pending = new Map(); }
  async connect() { this.ws = new WebSocket(this.url); this.ws.addEventListener('message', e => { const m = JSON.parse(e.data); const p = this.pending.get(m.id); if (p) { clearTimeout(p.timer); this.pending.delete(m.id); p.resolve(m); } }); await new Promise((resolve, reject) => { this.ws.addEventListener('open', resolve, { once: true }); this.ws.addEventListener('error', reject, { once: true }); }); }
  cmd(method, params = {}, timeout = 60000) { const id = ++this.id; return new Promise((resolve, reject) => { const timer = setTimeout(() => { this.pending.delete(id); reject(new Error(method + ' timeout')); }, timeout); this.pending.set(id, { resolve, timer }); this.ws.send(JSON.stringify({ id, method, params })); }); }
  async eval(expression) { return (await this.cmd('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true, userGesture: true })).result?.result?.value; }
}
const tab = new Tab(page.webSocketDebuggerUrl); await tab.connect();
try {
  const before = await tab.eval(`(() => ({ assets: document.querySelectorAll('.image-selector__bottom-list-item[style*="mmbiz.qpic.cn"]').length, bodyImages: document.querySelectorAll('div.ProseMirror[style*="min-height"] img[data-upload="1"]').length }))()`);
  if (before.assets !== 4 || before.bodyImages !== 0) throw new Error('Preview gate failed: ' + JSON.stringify(before));
  const clicked = await tab.eval(`(() => { const b = Array.from(document.querySelectorAll('button')).find(x => x.offsetParent && x.innerText.trim() === '预览'); if (!b) return false; b.click(); return true; })()`);
  if (!clicked) throw new Error('Preview button unavailable');
  await new Promise(resolve => setTimeout(resolve, 4000));
  const after = await tab.eval(`(() => ({ text: (document.body.innerText || '').replace(/\\s+/g, ' ').slice(0,2000), dialogs: Array.from(document.querySelectorAll('[role=dialog], .dialog_wrp, .weui-desktop-dialog')).filter(x => x.offsetParent).map(x => x.innerText.replace(/\\s+/g,' ').slice(0,1200)) }))()`);
  console.log(JSON.stringify({ before, after }, null, 2));
} finally { tab.ws.close(); }
