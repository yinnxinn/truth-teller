const TARGET_ID = '100001209';
const pages = await (await fetch('http://127.0.0.1:9222/json')).json();
const page = pages.find(p => /mp\.weixin\.qq\.com/.test(p.url || '') && new RegExp('appmsgid=' + TARGET_ID).test(p.url || ''));
if (!page) throw new Error('Chrome sticker draft tab not found');
class Tab {
  constructor(url) { this.url = url; this.id = 0; this.pending = new Map(); }
  async connect() { this.ws = new WebSocket(this.url); this.ws.addEventListener('message', e => { const m = JSON.parse(e.data); const p = this.pending.get(m.id); if (p) { clearTimeout(p.timer); this.pending.delete(m.id); p.resolve(m); } }); await new Promise((resolve, reject) => { this.ws.addEventListener('open', resolve, { once: true }); this.ws.addEventListener('error', reject, { once: true }); }); }
  cmd(method, params = {}, timeout = 60000) { const id = ++this.id; return new Promise((resolve, reject) => { const timer = setTimeout(() => { this.pending.delete(id); reject(new Error(method + ' timeout')); }, timeout); this.pending.set(id, { resolve, timer }); this.ws.send(JSON.stringify({ id, method, params })); }); }
  async eval(expression) { return (await this.cmd('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true, userGesture: true })).result?.result?.value; }
}
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const tab = new Tab(page.webSocketDebuggerUrl); await tab.connect();
try {
  const confirmed = await tab.eval(`(() => {
    const dialog = Array.from(document.querySelectorAll('[role=dialog], .dialog_wrp, .weui-desktop-dialog'))
      .find(x => x.offsetParent && (x.innerText.includes('定时发表') || x.innerText.includes('继续发表')));
    const button = dialog && Array.from(dialog.querySelectorAll('button, a'))
      .find(x => x.offsetParent && (x.innerText.trim() === '发表' || x.innerText.trim() === '继续发表'));
    if (!button) return { ok: false, dialogs: Array.from(document.querySelectorAll('[role=dialog], .dialog_wrp, .weui-desktop-dialog')).filter(x => x.offsetParent).map(x => x.innerText.replace(/\\s+/g, ' ').slice(0,300)) };
    button.click();
    return { ok: true };
  })()`);
  if (!confirmed.ok) throw new Error('Publish confirmation unavailable: ' + JSON.stringify(confirmed));
  await sleep(12000);
  const state = await tab.eval(`(() => ({ href: location.href.replace(/token=\\d+/g, 'token=***'), text: (document.body.innerText || '').replace(/\\s+/g, ' ').slice(0,3000) }))()`);
  console.log(JSON.stringify({ confirmed, state }, null, 2));
} finally { tab.ws.close(); }
