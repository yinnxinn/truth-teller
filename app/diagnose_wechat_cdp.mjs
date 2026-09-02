import fs from "node:fs/promises";

const CDP_HTTP = "http://127.0.0.1:9222";
const LOG_PATH = "D:/wechat/logs/cdp_wechat_diagnose.json";

class Tab {
  constructor(wsUrl) {
    this.wsUrl = wsUrl;
    this.nextId = 0;
    this.pending = new Map();
  }
  async connect() {
    this.ws = new WebSocket(this.wsUrl);
    this.ws.addEventListener("message", (event) => {
      let msg;
      try { msg = JSON.parse(event.data); } catch { return; }
      if (msg.id && this.pending.has(msg.id)) {
        const pending = this.pending.get(msg.id);
        clearTimeout(pending.timeout);
        this.pending.delete(msg.id);
        pending.resolve(msg);
      }
    });
    await new Promise((resolve, reject) => {
      this.ws.addEventListener("open", resolve, { once: true });
      this.ws.addEventListener("error", reject, { once: true });
    });
  }
  cmd(method, params = {}, timeoutMs = 60000) {
    const id = ++this.nextId;
    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        this.pending.delete(id);
        resolve({ error: { message: `timeout calling ${method}` } });
      }, timeoutMs);
      this.pending.set(id, { resolve, timeout });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }
  async eval(expression, timeoutMs = 60000) {
    const res = await this.cmd("Runtime.evaluate", {
      expression,
      returnByValue: true,
      awaitPromise: true,
      userGesture: true,
    }, timeoutMs);
    const result = res?.result?.result;
    if (result && Object.hasOwn(result, "value")) return result.value;
    return result?.description ? { description: result.description } : res;
  }
  close() { this.ws?.close(); }
}

async function main() {
  await fs.mkdir("D:/wechat/logs", { recursive: true });
  const pages = await (await fetch(`${CDP_HTTP}/json`)).json();
  const mpPage = pages.find(page => (page.url || "").includes("mp.weixin.qq.com"));
  const log = { ok: false, pages: pages.map(p => ({ title: p.title, url: (p.url || "").replace(/token=\d+/g, "token=***") })) };
  if (!mpPage) throw new Error("no mp.weixin.qq.com page");

  const tab = new Tab(mpPage.webSocketDebuggerUrl);
  await tab.connect();
  try {
    const tokenMatch = (mpPage.url || "").match(/token=(\d+)/);
    const token = tokenMatch?.[1] || "";
    log.hasToken = !!token;
    log.page = await tab.eval(String.raw`
(() => ({
  href: location.href.replace(/token=\d+/g, 'token=***'),
  title: document.title,
  readyState: document.readyState,
  bodyLen: document.body ? document.body.textContent.length : 0,
  bodyHead: document.body ? document.body.textContent.replace(/\s+/g, ' ').slice(0, 1000) : '',
  scriptCount: document.scripts.length,
  editableCount: document.querySelectorAll('[contenteditable="true"]').length,
  titleInput: !!document.querySelector('#title'),
  appmsgElements: Array.from(document.querySelectorAll('[class*="appmsg"], [data-appmsgid], [appmsgid]')).slice(0, 20).map(el => ({
    tag: el.tagName,
    cls: String(el.className || '').slice(0, 80),
    appmsgid: el.getAttribute('appmsgid') || el.getAttribute('data-appmsgid') || '',
    text: (el.textContent || '').replace(/\s+/g, ' ').slice(0, 120)
  }))
})()
`);
    if (token) {
      log.draftApi = await tab.eval(String.raw`
(async (token) => {
  const urls = [
    '/cgi-bin/appmsg?action=list_ex&begin=0&count=20&type=77&token=' + encodeURIComponent(token) + '&lang=zh_CN&f=json',
    '/cgi-bin/appmsg?action=list&begin=0&count=20&type=77&token=' + encodeURIComponent(token) + '&lang=zh_CN&f=json',
    '/cgi-bin/appmsgpublish?action=list&begin=0&count=20&token=' + encodeURIComponent(token) + '&lang=zh_CN&f=json'
  ];
  const out = [];
  for (const url of urls) {
    try {
      const res = await fetch(url, { credentials: 'include' });
      const text = await res.text();
      let parsed = null;
      try { parsed = JSON.parse(text); } catch {}
      out.push({
        url: url.replace(/token=\d+/g, 'token=***'),
        status: res.status,
        head: text.slice(0, 300),
        items: (parsed?.app_msg_list || parsed?.list || parsed?.publish_page || []).slice?.(0, 10)?.map?.(item => ({
          appmsgid: item.appmsgid || item.app_msg_id || item.id || '',
          title: item.title || item.name || '',
          update_time: item.update_time || item.create_time || ''
        })) || []
      });
    } catch (e) {
      out.push({ url: url.replace(/token=\d+/g, 'token=***'), error: String(e) });
    }
  }
  return out;
})(${JSON.stringify(token)})
`, 60000);
    }
    log.ok = true;
  } finally {
    tab.close();
  }
  await fs.writeFile(LOG_PATH, JSON.stringify(log, null, 2), "utf8");
  console.log(JSON.stringify({ ok: log.ok, log: LOG_PATH, page: log.page, draftApi: log.draftApi }, null, 2));
}

await main();
