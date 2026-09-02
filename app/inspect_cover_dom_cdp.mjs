const CDP_HTTP = "http://127.0.0.1:9222";

class Tab {
  constructor(wsUrl) { this.wsUrl = wsUrl; this.nextId = 0; this.pending = new Map(); }
  async connect() {
    this.ws = new WebSocket(this.wsUrl);
    this.ws.addEventListener("message", event => {
      let msg; try { msg = JSON.parse(event.data); } catch { return; }
      if (msg.id && this.pending.has(msg.id)) {
        const p = this.pending.get(msg.id); clearTimeout(p.timeout); this.pending.delete(msg.id); p.resolve(msg);
      }
    });
    await new Promise((resolve, reject) => {
      this.ws.addEventListener("open", resolve, { once: true });
      this.ws.addEventListener("error", reject, { once: true });
    });
  }
  cmd(method, params = {}, timeoutMs = 30000) {
    const id = ++this.nextId;
    return new Promise(resolve => {
      const timeout = setTimeout(() => { this.pending.delete(id); resolve({ error: { message: `timeout ${method}` } }); }, timeoutMs);
      this.pending.set(id, { resolve, timeout });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }
  async eval(expression, timeoutMs = 30000) {
    const res = await this.cmd("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true, userGesture: true }, timeoutMs);
    const result = res?.result?.result;
    return result && Object.hasOwn(result, "value") ? result.value : result?.description || res;
  }
  close() { this.ws?.close(); }
}

async function main() {
  const pages = await (await fetch(`${CDP_HTTP}/json`)).json();
  const page = pages.find(p => (p.url || "").includes("mp.weixin.qq.com"));
  if (!page) throw new Error("no mp page");
  const tab = new Tab(page.webSocketDebuggerUrl);
  await tab.connect();
  try {
    const info = await tab.eval(String.raw`
(() => {
  const simplify = el => ({
    tag: el.tagName,
    id: el.id || '',
    cls: String(el.className || '').slice(0, 120),
    text: (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 160),
    visible: !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length),
    html: el.outerHTML.slice(0, 260),
  });
  const buttons = Array.from(document.querySelectorAll('button, a, .weui-desktop-btn, [role="button"]'))
    .map(simplify)
    .filter(x => /封面|从正文|图片|上传|裁剪|完成|下一步|保存/.test(x.text + x.id + x.cls))
    .slice(0, 80);
  const coverish = Array.from(document.querySelectorAll('[id*="cover"], [class*="cover"], [class*="thumb"], [class*="pic"], [class*="image"]'))
    .map(simplify)
    .filter(x => x.visible || /cover|thumb|封面|图片/.test(x.text + x.id + x.cls))
    .slice(0, 120);
  const inputs = Array.from(document.querySelectorAll('input[type="file"]')).map(simplify);
  return { href: location.href.replace(/token=\d+/g, 'token=***'), buttons, coverish, inputs };
})()
`, 30000);
    console.log(JSON.stringify(info, null, 2));
  } finally {
    tab.close();
  }
}

await main();
