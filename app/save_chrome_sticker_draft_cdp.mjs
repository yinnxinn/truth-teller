const pages = await (await fetch('http://127.0.0.1:9222/json')).json();
const page = pages
  .filter(p => /mp\.weixin\.qq\.com/.test(p.url || '') && /createType=8/.test(p.url || ''))
  .sort((a, b) => Number(b.url.match(/timestamp=(\d+)/)?.[1] || 0) - Number(a.url.match(/timestamp=(\d+)/)?.[1] || 0))[0];
if (!page) throw new Error('No open WeChat sticker editor found');
class Tab {
  constructor(url) { this.url = url; this.id = 0; this.pending = new Map(); }
  async connect() { this.ws = new WebSocket(this.url); this.ws.addEventListener('message', e => { const m = JSON.parse(e.data); const p = this.pending.get(m.id); if (p) { clearTimeout(p.timer); this.pending.delete(m.id); p.resolve(m); } }); await new Promise((resolve, reject) => { this.ws.addEventListener('open', resolve, { once: true }); this.ws.addEventListener('error', reject, { once: true }); }); }
  cmd(method, params = {}, timeout = 60000) { const id = ++this.id; return new Promise((resolve, reject) => { const timer = setTimeout(() => { this.pending.delete(id); reject(new Error(method + ' timeout')); }, timeout); this.pending.set(id, { resolve, timer }); this.ws.send(JSON.stringify({ id, method, params })); }); }
  async eval(expression) { return (await this.cmd('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true, userGesture: true })).result?.result?.value; }
}
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const tab = new Tab(page.webSocketDebuggerUrl); await tab.connect();
try {
  const before = await tab.eval(`location.href.replace(/token=\\d+/g, 'token=***')`);
  const click = await tab.eval(`(() => {
    const button = Array.from(document.querySelectorAll('button')).find(x => x.offsetParent && x.innerText.trim() === '保存为草稿');
    if (!button) return { ok: false };
    button.click();
    return { ok: true };
  })()`);
  if (!click?.ok) throw new Error('Save draft button not found');
  await sleep(8000);
  const after = await tab.eval(`(() => ({ href: location.href.replace(/token=\\d+/g, 'token=***'), text: (document.body.innerText || '').replace(/\\s+/g,' ').slice(0,2500), title: document.querySelector('div.ProseMirror[data-placeholder="请在这里输入标题"]')?.innerText || '' }))()`);
  console.log(JSON.stringify({ before, after }, null, 2));
} finally { tab.ws.close(); }
