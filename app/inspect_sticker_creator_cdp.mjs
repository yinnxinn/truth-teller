const CDP_HTTP = 'http://127.0.0.1:9222';
class Tab {
  constructor(wsUrl) { this.wsUrl = wsUrl; this.id = 0; this.pending = new Map(); }
  async connect() { this.ws = new WebSocket(this.wsUrl); this.ws.addEventListener('message', e => { const m = JSON.parse(e.data); const p = this.pending.get(m.id); if (p) { clearTimeout(p.timer); this.pending.delete(m.id); p.resolve(m); } }); await new Promise((resolve, reject) => { this.ws.addEventListener('open', resolve, { once: true }); this.ws.addEventListener('error', reject, { once: true }); }); }
  cmd(method, params = {}, timeout = 45000) { const id = ++this.id; return new Promise((resolve, reject) => { const timer = setTimeout(() => { this.pending.delete(id); reject(new Error(`timeout: ${method}`)); }, timeout); this.pending.set(id, { resolve, timer }); this.ws.send(JSON.stringify({ id, method, params })); }); }
  async eval(expression) { return (await this.cmd('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true, userGesture: true })).result?.result?.value; }
  close() { this.ws?.close(); }
}
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const pages = await (await fetch(`${CDP_HTTP}/json`)).json();
const page = pages.find(p => /mp\.weixin\.qq\.com\/cgi-bin\/home\?.*token=\d+/.test(p.url || '')) || pages.find(p => (p.url || '').includes('mp.weixin.qq.com') && /token=\d+/.test(p.url || ''));
if (!page) throw new Error('No logged-in WeChat tab found');
const token = page.url.match(/token=(\d+)/)?.[1];
const tab = new Tab(page.webSocketDebuggerUrl); await tab.connect();
try {
  await tab.cmd('Page.navigate', { url: `https://mp.weixin.qq.com/cgi-bin/home?t=home/index&token=${token}&lang=zh_CN` });
  await sleep(4000);
  const click = await tab.eval(`(() => {
    const node = Array.from(document.querySelectorAll('.new-creation__menu-item'))
      .find(x => x.innerText.trim() === '贴图');
    if (!node) return { clicked: false };
    const r = node.getBoundingClientRect();
    return { clicked: true, x: r.left + r.width / 2, y: r.top + r.height / 2, width: r.width, height: r.height };
  })()`);
  if (!click?.clicked) throw new Error('Sticker creator entry not found');
  await tab.cmd('Input.dispatchMouseEvent', { type: 'mouseMoved', x: click.x, y: click.y });
  await tab.cmd('Input.dispatchMouseEvent', { type: 'mousePressed', x: click.x, y: click.y, button: 'left', clickCount: 1 });
  await tab.cmd('Input.dispatchMouseEvent', { type: 'mouseReleased', x: click.x, y: click.y, button: 'left', clickCount: 1 });
  await sleep(3000);
  const state = await tab.eval(`(() => ({ href: location.href.replace(/token=\\d+/g, 'token=***'), text: (document.body?.innerText || '').replace(/\\s+/g,' ').slice(0,1800), inputs: Array.from(document.querySelectorAll('input,textarea,[contenteditable=true]')).map(x => ({tag:x.tagName,id:x.id,placeholder:x.getAttribute('placeholder') || '',type:x.getAttribute('type') || '',text:(x.textContent || x.value || '').slice(0,100)})).slice(0,40), files:Array.from(document.querySelectorAll('input[type=file]')).map((x,i)=>({i,accept:x.accept || '',outer:x.outerHTML.slice(0,300)})) }))()`);
  const allPages = (await (await fetch(`${CDP_HTTP}/json`)).json())
    .filter(p => (p.url || '').includes('mp.weixin.qq.com'))
    .map(p => ({ title: p.title, url: p.url.replace(/token=\\d+/g, 'token=***') }));
  console.log(JSON.stringify({ click, state, allPages }, null, 2));
} finally { tab.close(); }
