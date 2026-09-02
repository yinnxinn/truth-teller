const pages = await (await fetch('http://127.0.0.1:9222/json')).json();
const candidates = pages
  .filter(p => /mp\.weixin\.qq\.com/.test(p.url || '') && (/createType=8/.test(p.url || '') || /appmsgid=100001200/.test(p.url || '')))
  .sort((a, b) => (b.url.match(/timestamp=(\d+)/)?.[1] || 0) - (a.url.match(/timestamp=(\d+)/)?.[1] || 0));
if (!candidates[0]) throw new Error('No sticker editor tab found');

class Tab {
  constructor(url) { this.url = url; this.id = 0; this.pending = new Map(); }
  async connect() {
    this.ws = new WebSocket(this.url);
    this.ws.addEventListener('message', e => { const m = JSON.parse(e.data); const p = this.pending.get(m.id); if (p) { clearTimeout(p.timer); this.pending.delete(m.id); p.resolve(m); } });
    await new Promise((resolve, reject) => { this.ws.addEventListener('open', resolve, { once: true }); this.ws.addEventListener('error', reject, { once: true }); });
  }
  cmd(method, params = {}) { const id = ++this.id; return new Promise((resolve, reject) => { const timer = setTimeout(() => reject(new Error(method + ' timeout')), 30000); this.pending.set(id, { resolve, timer }); this.ws.send(JSON.stringify({ id, method, params })); }); }
  async eval(expression) {
    const response = await this.cmd('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true, userGesture: true });
    if (response.result?.exceptionDetails) throw new Error(response.result.exceptionDetails.text + ': ' + (response.result.exceptionDetails.exception?.description || ''));
    return response.result?.result?.value;
  }
}
const tab = new Tab(candidates[0].webSocketDebuggerUrl);
await tab.connect();
try {
  await new Promise(resolve => setTimeout(resolve, 3000));
  const state = await tab.eval(`(() => ({
    href: location.href.replace(/token=\\d+/g, 'token=***'),
    text: (document.body?.innerText || '').replace(/\\s+/g, ' ').slice(0, 5000),
    inputs: Array.from(document.querySelectorAll('input, textarea, [contenteditable=true]')).map((x, i) => ({ i, tag: x.tagName, type: x.getAttribute('type') || '', placeholder: x.getAttribute('placeholder') || '', value: (x.value || x.textContent || '').slice(0, 200), outer: x.outerHTML.slice(0, 500) })),
    files: Array.from(document.querySelectorAll('input[type=file]')).map((x, i) => ({ i, accept: x.accept || '', outer: x.outerHTML.slice(0, 500), parent: x.parentElement?.outerHTML.slice(0, 1600) || '', grandparent: x.parentElement?.parentElement?.outerHTML.slice(0, 2200) || '' })),
    uploadZones: Array.from(document.querySelectorAll('[class*=upload], [class*=Upload], [class*=image], [class*=Image]')).filter(x => x.offsetParent && ['拖拽图片', '选择', '/20'].some(s => (x.innerText || '').includes(s))).map(x => ({ cls: String(x.className || ''), text: (x.innerText || '').replace(/\\s+/g,' ').slice(0,500), outer: x.outerHTML.slice(0,2500) })).slice(0,20),
    buttons: Array.from(document.querySelectorAll('button, a, [role=button], .weui-desktop-btn')).filter(x => x.offsetParent).map(x => ({ text: (x.innerText || x.textContent || '').trim().slice(0,100), cls: String(x.className || '').slice(0,160), outer: x.outerHTML.slice(0,500) })).slice(0,100)
  }))()`);
  console.log(JSON.stringify(state, null, 2));
} finally { tab.ws.close(); }
