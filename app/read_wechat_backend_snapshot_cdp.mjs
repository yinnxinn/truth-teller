import fs from "node:fs/promises";

const CDP_HTTP = "http://127.0.0.1:9222";
const LOG_PATH = "D:/wechat/logs/cdp_backend_snapshot.json";

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
  cmd(method, params = {}, timeoutMs = 60000) {
    const id = ++this.nextId;
    return new Promise(resolve => {
      const timeout = setTimeout(() => { this.pending.delete(id); resolve({ error: { message: `timeout ${method}` } }); }, timeoutMs);
      this.pending.set(id, { resolve, timeout });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }
  async eval(expression, timeoutMs = 60000) {
    const res = await this.cmd("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true, userGesture: true }, timeoutMs);
    const result = res?.result?.result;
    return result && Object.hasOwn(result, "value") ? result.value : result?.description || res;
  }
  close() { this.ws?.close(); }
}

async function wait(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

async function main() {
  await fs.mkdir("D:/wechat/logs", { recursive: true });
  const pages = await (await fetch(`${CDP_HTTP}/json`)).json();
  const page = pages.find(p => /mp\.weixin\.qq\.com\/cgi-bin\/home\?.*token=\d+/.test(p.url || ""))
    || pages.find(p => /mp\.weixin\.qq\.com\/cgi-bin\/appmsg\?.*action=list_card.*token=\d+/.test(p.url || ""))
    || pages.find(p => (p.url || "").includes("mp.weixin.qq.com") && /token=\d+/.test(p.url || ""))
    || pages.find(p => (p.url || "").includes("mp.weixin.qq.com"));
  if (!page) throw new Error("no mp.weixin.qq.com page");
  const token = (page.url || "").match(/token=(\d+)/)?.[1] || "";
  if (!token) throw new Error("no token");

  const tab = new Tab(page.webSocketDebuggerUrl);
  await tab.connect();
  const log = { ok: false, tokenFound: !!token, pages: [] };
  try {
    await tab.cmd("Page.enable");
    await tab.cmd("Runtime.enable");
    const urls = [
      `https://mp.weixin.qq.com/cgi-bin/home?t=home/index&lang=zh_CN&token=${token}`,
      `https://mp.weixin.qq.com/cgi-bin/appmsg?action=list_card&begin=0&count=20&type=77&token=${token}&lang=zh_CN`,
      `https://mp.weixin.qq.com/misc/appmsganalysis?action=all&token=${token}&lang=zh_CN`,
    ];
    for (const url of urls) {
      await tab.cmd("Page.navigate", { url }, 30000);
      await wait(8000);
      const state = await tab.eval(String.raw`
(() => {
  const text = document.body ? document.body.textContent.replace(/\s+/g, ' ').trim() : '';
  const links = Array.from(document.querySelectorAll('a')).map(a => ({
    text: (a.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 80),
    href: (a.href || '').replace(/token=\d+/g, 'token=***').slice(0, 180)
  })).filter(x => x.text || x.href).slice(0, 120);
  const numbers = Array.from(text.matchAll(/(?:阅读|分享|收藏|点赞|留言|粉丝|新增|总用户|打开|曝光|点击|发表|草稿|原创|收益|流量)[^0-9一二三四五六七八九十]{0,12}([0-9,.万亿]+|暂无|--)/g)).map(m => m[0]).slice(0, 80);
  const titles = Array.from(document.querySelectorAll('[class*="title"], .weui-desktop-mass__title, .weui-desktop-appmsg__title, .weui-desktop-media__title'))
    .map(el => (el.textContent || '').replace(/\s+/g, ' ').trim()).filter(Boolean).slice(0, 80);
  return {
    href: location.href.replace(/token=\d+/g, 'token=***'),
    title: document.title,
    textLen: text.length,
    textHead: text.slice(0, 1500),
    numbers,
    titles,
    links,
  };
})()
`, 60000);
      log.pages.push(state);
    }
    log.draftApi = await tab.eval(String.raw`
(async (token) => {
  const out = [];
  for (const begin of [0, 20, 40, 60]) {
    const url = '/cgi-bin/appmsg?action=list_ex&begin=' + begin + '&count=20&type=77&token=' + encodeURIComponent(token) + '&lang=zh_CN&f=json';
    try {
      const res = await fetch(url, { credentials: 'include' });
      const txt = await res.text();
      let parsed = null;
      try { parsed = JSON.parse(txt); } catch {}
      out.push({
        begin,
        status: res.status,
        ret: parsed?.base_resp?.ret,
        errmsg: parsed?.base_resp?.errmsg,
        count: (parsed?.app_msg_list || []).length,
        items: (parsed?.app_msg_list || []).map(x => ({
          appmsgid: x.appmsgid,
          title: x.title || '',
          update_time: x.update_time || x.create_time || '',
        })),
        head: txt.slice(0, 200)
      });
    } catch (e) {
      out.push({ begin, error: String(e) });
    }
  }
  return out;
})(${JSON.stringify(token)})
`, 60000);
    log.ok = true;
  } finally {
    tab.close();
  }
  await fs.writeFile(LOG_PATH, JSON.stringify(log, null, 2), "utf8");
  console.log(JSON.stringify({
    ok: log.ok,
    log: LOG_PATH,
    pages: log.pages.map(p => ({ href: p.href, title: p.title, textLen: p.textLen, head: p.textHead.slice(0, 300), numbers: p.numbers.slice(0, 10), titles: p.titles.slice(0, 10) })),
    draftCounts: log.draftApi?.map(x => ({ begin: x.begin, status: x.status, ret: x.ret, count: x.count, items: x.items?.slice(0, 5) })),
  }, null, 2));
}

await main();
