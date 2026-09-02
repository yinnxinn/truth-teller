const CDP_HTTP = 'http://127.0.0.1:9222';
const APPMSGID = process.env.WECHAT_APPMSGID;
const DRY_RUN = process.env.WECHAT_PUBLISH_DRY_RUN === '1';
if (!APPMSGID) throw new Error('WECHAT_APPMSGID is required');

class Tab {
  constructor(wsUrl) { this.wsUrl = wsUrl; this.id = 0; this.pending = new Map(); }
  async connect() {
    this.ws = new WebSocket(this.wsUrl);
    this.ws.addEventListener('message', e => {
      const msg = JSON.parse(e.data); const pending = this.pending.get(msg.id);
      if (pending) { clearTimeout(pending.timer); this.pending.delete(msg.id); pending.resolve(msg); }
    });
    await new Promise((resolve, reject) => { this.ws.addEventListener('open', resolve, { once: true }); this.ws.addEventListener('error', reject, { once: true }); });
  }
  cmd(method, params = {}, timeout = 45000) {
    const id = ++this.id;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => { this.pending.delete(id); reject(new Error(`timeout: ${method}`)); }, timeout);
      this.pending.set(id, { resolve, timer }); this.ws.send(JSON.stringify({ id, method, params }));
    });
  }
  async eval(expression) { return (await this.cmd('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true, userGesture: true })).result?.result?.value; }
  close() { this.ws?.close(); }
}

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const pages = await (await fetch(`${CDP_HTTP}/json`)).json();
const page = pages.find(p => (p.url || '').includes(`appmsgid=${APPMSGID}`) && /token=\d+/.test(p.url || ''))
  || pages.find(p => /mp\.weixin\.qq\.com\/cgi-bin\/home\?.*token=\d+/.test(p.url || ''))
  || pages.find(p => (p.url || '').includes('mp.weixin.qq.com') && /token=\d+/.test(p.url || ''));
if (!page) throw new Error('No logged-in WeChat tab found');
const token = page.url.match(/token=(\d+)/)?.[1];
if (!token) throw new Error('No WeChat token found');
const tab = new Tab(page.webSocketDebuggerUrl);
await tab.connect();
try {
  const editUrl = `https://mp.weixin.qq.com/cgi-bin/appmsg?t=media/appmsg_edit&action=edit&reprint_confirm=0&type=77&appmsgid=${APPMSGID}&token=${token}&lang=zh_CN`;
  await tab.cmd('Page.navigate', { url: editUrl });
  for (let i = 0; i < 40; i++) { if (await tab.eval("!!document.querySelector('#title')")) break; await sleep(700); }
  const before = await tab.eval(`(() => ({
    title: document.querySelector('#title')?.value || '',
    buttons: Array.from(document.querySelectorAll('button,a,.weui-desktop-btn')).filter(x => x.offsetParent).map(x => (x.textContent || '').replace(/\\s+/g,' ').trim()).filter(Boolean).filter(x => /发表|保存|群发/.test(x)).slice(0, 30),
    dialogs: Array.from(document.querySelectorAll('[role=dialog],.weui-desktop-dialog')).filter(x => x.offsetParent).map(x => (x.innerText || '').replace(/\\s+/g,' ').trim().slice(0,200))
  }))()`);
  if (DRY_RUN) { console.log(JSON.stringify({ dryRun: true, appmsgid: APPMSGID, before }, null, 2)); }
  else {
    const clicked = await tab.eval(`(() => {
      const controls = Array.from(document.querySelectorAll('button,a,.weui-desktop-btn')).filter(x => x.offsetParent);
      const button = controls.find(x => /发表文章|^发表$/.test((x.textContent || '').replace(/\\s+/g,'').trim()));
      if (!button) return false; button.click(); return true;
    })()`);
    if (!clicked) throw new Error('Publish button not found');
    await sleep(1600);
    const confirmClicked = await tab.eval(`(() => {
      const controls = Array.from(document.querySelectorAll('button,a,.weui-desktop-btn')).filter(x => x.offsetParent);
      const button = controls.find(x => /^(确定发表|发表|确认)$/.test((x.textContent || '').replace(/\\s+/g,'').trim()));
      if (!button) return false; button.click(); return true;
    })()`);
    await sleep(5000);
    const after = await tab.eval(`(() => ({ href: location.href.replace(/token=\\d+/g, 'token=***'), title: document.querySelector('#title')?.value || '', confirmClicked, visibleText: (document.body?.innerText || '').replace(/\\s+/g,' ').slice(0,500) }))()`);
    console.log(JSON.stringify({ published: true, appmsgid: APPMSGID, before, after }, null, 2));
  }
} finally { tab.close(); }
