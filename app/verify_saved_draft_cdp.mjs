import fs from "node:fs/promises";

const CDP_HTTP = "http://127.0.0.1:9222";
const LOG_PATH = "D:/wechat/logs/cdp_verify_saved_draft.json";
const APPMSGID = process.env.WECHAT_APPMSGID || "100000102";

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

async function waitFor(tab, expression, timeoutMs = 45000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const ok = await tab.eval(expression, 10000);
    if (ok) return true;
    await new Promise(resolve => setTimeout(resolve, 800));
  }
  return false;
}

async function main() {
  await fs.mkdir("D:/wechat/logs", { recursive: true });
  const pages = await (await fetch(`${CDP_HTTP}/json`)).json();
  const mpPage = pages.find(page => /mp\.weixin\.qq\.com\/cgi-bin\/home\?.*token=\d+/.test(page.url || ""))
    || pages.find(page => /mp\.weixin\.qq\.com\/cgi-bin\/appmsg\?.*action=list_card.*token=\d+/.test(page.url || ""))
    || pages.find(page => (page.url || "").includes("mp.weixin.qq.com") && /token=\d+/.test(page.url || ""))
    || pages.find(page => (page.url || "").includes("mp.weixin.qq.com"));
  if (!mpPage) throw new Error("no mp.weixin.qq.com page");
  const token = (mpPage.url || "").match(/token=(\d+)/)?.[1] || "";
  if (!token) throw new Error("no token in current mp.weixin page");

  const tab = new Tab(mpPage.webSocketDebuggerUrl);
  await tab.connect();
  const log = { ok: false, appmsgid: APPMSGID };
  try {
    const editUrl = `https://mp.weixin.qq.com/cgi-bin/appmsg?t=media/appmsg_edit&action=edit&reprint_confirm=0&type=77&appmsgid=${APPMSGID}&token=${token}&lang=zh_CN`;
    await tab.cmd("Page.navigate", { url: editUrl });
    await waitFor(tab, "document.readyState === 'complete'", 60000);
    await waitFor(tab, "!!document.querySelector('[contenteditable=\"true\"], textarea, input')", 60000);
    await new Promise(resolve => setTimeout(resolve, 5000));

    log.state = await tab.eval(String.raw`
(() => {
  const editables = Array.from(document.querySelectorAll('[contenteditable="true"]')).map((el, index) => ({
    index,
    className: String(el.className || ''),
    textLen: (el.textContent || '').length,
    htmlLen: (el.innerHTML || '').length,
    textHead: (el.textContent || '').replace(/\s+/g, ' ').slice(0, 260),
    hasOldDate: /2026[-年]08[-月]15|2026[-年]8[-月]15/.test(el.textContent || el.innerHTML || ''),
    hasNewJudge: (el.textContent || '').includes('这篇原文真正值得追问的'),
    hasTruthLabel: (el.textContent || '').includes('真相一句话'),
    imgCount: el.querySelectorAll('img').length,
    dataImgCount: Array.from(el.querySelectorAll('img')).filter(img => (img.getAttribute('src') || '').startsWith('data:')).length,
    mmbizImgCount: Array.from(el.querySelectorAll('img')).filter(img => (img.getAttribute('src') || '').includes('mmbiz')).length,
  }));
  const titleCandidates = Array.from(document.querySelectorAll('textarea, input')).map((el, index) => ({
    index,
    id: el.id || '',
    placeholder: el.getAttribute('placeholder') || '',
    value: el.value || '',
    valueLen: (el.value || '').length,
  })).filter(x => x.valueLen || /标题|title/i.test(x.id + x.placeholder));
  return {
    href: location.href.replace(/token=\d+/g, 'token=***'),
    documentTitle: document.title,
    titleCandidates,
    editables,
    cover: (() => {
      const area = document.querySelector('#js_cover_area');
      const html = area ? area.innerHTML : '';
      return {
        hasMmbiz: /mmbiz|mmbiz_qpic|wx_fmt/.test(html),
        hasBgUrl: /background-image:\s*url\((?!['"]?['"]?\))/.test(html),
      };
    })(),
    dialogs: Array.from(document.querySelectorAll('.weui-desktop-dialog, .weui-desktop-dialog__wrp, [role="dialog"]')).map(el => (el.textContent || '').replace(/\s+/g, ' ').trim()).filter(Boolean),
  };
})()
`, 60000);
    log.ok = true;
  } finally {
    tab.close();
  }
  await fs.writeFile(LOG_PATH, JSON.stringify(log, null, 2), "utf8");
  const bestEditable = (log.state?.editables || []).slice().sort((a, b) => b.textLen - a.textLen)[0] || null;
  console.log(JSON.stringify({
    ok: log.ok,
    appmsgid: log.appmsgid,
    log: LOG_PATH,
    title: log.state?.titleCandidates?.find(x => x.id === "title")?.value || "",
    cover: log.state?.cover || null,
    bestEditable,
    dialogs: log.state?.dialogs || [],
  }, null, 2));
}

await main();
