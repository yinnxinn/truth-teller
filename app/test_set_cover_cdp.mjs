import path from "node:path";
import fs from "node:fs/promises";

const CDP_HTTP = "http://127.0.0.1:9222";
const COVER_PATH = process.env.WECHAT_COVER_PATH || "D:/wechat/assets/images/2026-08-15-ai评分裁员/ai评分裁员-1.jpg";
const LOG_PATH = "D:/wechat/logs/cdp_test_set_cover.json";

class Tab {
  constructor(wsUrl) { this.wsUrl = wsUrl; this.nextId = 0; this.pending = new Map(); this.rootNodeId = null; }
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
  async nodeId(selector) {
    if (!this.rootNodeId) {
      const doc = await this.cmd("DOM.getDocument", { depth: 0 });
      this.rootNodeId = doc?.result?.root?.nodeId;
    }
    const res = await this.cmd("DOM.querySelector", { nodeId: this.rootNodeId, selector });
    return res?.result?.nodeId || 0;
  }
  async setFile(selector, filePath) {
    const nodeId = await this.nodeId(selector);
    if (!nodeId) return { success: false, error: `not found ${selector}` };
    const abs = path.resolve(filePath);
    return await this.cmd("DOM.setFileInputFiles", { nodeId, files: [abs] }, 60000);
  }
  close() { this.ws?.close(); }
}

async function waitFor(tab, fnExpr, timeoutMs = 45000) {
  const started = Date.now();
  let last = null;
  while (Date.now() - started < timeoutMs) {
    last = await tab.eval(fnExpr, 10000);
    if (last?.ok || last === true) return last;
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  return last || { ok: false, error: "timeout" };
}

async function main() {
  await fs.mkdir("D:/wechat/logs", { recursive: true });
  await fs.access(COVER_PATH);
  const pages = await (await fetch(`${CDP_HTTP}/json`)).json();
  const page = pages.find(p => (p.url || "").includes("mp.weixin.qq.com"));
  if (!page) throw new Error("no mp page");
  const tab = new Tab(page.webSocketDebuggerUrl);
  await tab.connect();
  const log = { ok: false, cover: COVER_PATH, events: [] };
  try {
    await tab.cmd("DOM.enable");
    await tab.cmd("Runtime.enable");
    log.before = await tab.eval(String.raw`
(() => {
  const area = document.querySelector('#js_cover_area');
  return {
    ok: !!area,
    text: area ? area.textContent.replace(/\s+/g, ' ').trim().slice(0, 200) : '',
    preview: !!document.querySelector('.js_cover_preview_new[style*="background-image"]'),
    fileInputs: document.querySelectorAll('input[type="file"]').length,
  };
})()
`);
    log.clickDialog = await tab.eval(String.raw`
(() => {
  const area = document.querySelector('#js_cover_area') || document;
  const link = Array.from(area.querySelectorAll('.js_imagedialog, a, button')).find(el => (el.textContent || '').includes('从图片库选择')) ||
    Array.from(document.querySelectorAll('.js_imagedialog')).find(el => el.offsetParent !== null) ||
    document.querySelector('.js_imagedialog');
  if (!link) return { ok: false, error: 'no image dialog link' };
  link.click();
  return { ok: true, text: (link.textContent || '').trim(), cls: String(link.className || '') };
})()
`);
    log.events.push("clicked_image_dialog");
    log.dialogAfterClick = await waitFor(tab, String.raw`
(() => {
  const d = Array.from(document.querySelectorAll('.weui-desktop-dialog, .weui-desktop-dialog__wrp, .weui-desktop-modal')).find(el => el.offsetParent !== null || el.getClientRects().length);
  const input = document.querySelector('.weui-desktop-dialog input[type="file"], .weui-desktop-dialog__wrp input[type="file"], input[type="file"]');
  return {
    ok: !!input,
    dialogText: d ? d.textContent.replace(/\s+/g, ' ').trim().slice(0, 500) : '',
    inputCount: document.querySelectorAll('input[type="file"]').length,
    inputs: Array.from(document.querySelectorAll('input[type="file"]')).map((el, index) => ({
      index,
      accept: el.getAttribute('accept') || '',
      className: String(el.className || ''),
      outer: el.outerHTML.slice(0, 500)
    }))
  };
})()
`, 30000);
    log.setFile = await tab.setFile('.weui-desktop-dialog input[type="file"], .weui-desktop-dialog__wrp input[type="file"], input[type="file"]', COVER_PATH);
    log.events.push("set_file");
    await new Promise(resolve => setTimeout(resolve, 6000));
    log.afterUpload = await tab.eval(String.raw`
(() => {
  const d = Array.from(document.querySelectorAll('.weui-desktop-dialog, .weui-desktop-dialog__wrp, .weui-desktop-modal')).find(el => el.offsetParent !== null || el.getClientRects().length);
  return {
    text: d ? d.textContent.replace(/\s+/g, ' ').trim().slice(0, 800) : '',
    imgs: d ? d.querySelectorAll('img').length : 0,
    candidates: d ? Array.from(d.querySelectorAll('[style*="background"], [data-fileid], [data-url], [data-mediaid]')).slice(0, 80).map((el, index) => ({
      index,
      tag: el.tagName,
      className: String(el.className || '').slice(0, 180),
      text: (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 80),
      style: (el.getAttribute('style') || '').slice(0, 260),
      fileid: el.getAttribute('data-fileid') || el.getAttribute('data-mediaid') || '',
      url: (el.getAttribute('data-url') || '').slice(0, 140)
    })) : [],
    buttons: d ? Array.from(d.querySelectorAll('button, a.weui-desktop-btn, .weui-desktop-btn')).map(b => (b.textContent || '').replace(/\s+/g, ' ').trim()).filter(Boolean).slice(0, 30) : [],
  };
})()
`);
    log.next = await tab.eval(String.raw`
(() => {
  const d = Array.from(document.querySelectorAll('.weui-desktop-dialog, .weui-desktop-dialog__wrp, .weui-desktop-modal')).find(el => el.offsetParent !== null || el.getClientRects().length) || document;
  const btn = Array.from(d.querySelectorAll('button, a.weui-desktop-btn, .weui-desktop-btn')).find(b => /下一步|确定|完成/.test((b.textContent || '').trim()));
  if (!btn) return { ok: false, buttons: Array.from(d.querySelectorAll('button, a.weui-desktop-btn, .weui-desktop-btn')).map(b => (b.textContent || '').trim()).filter(Boolean).slice(0, 20) };
  btn.click();
  return { ok: true, clicked: (btn.textContent || '').trim() };
})()
`);
    log.events.push("clicked_next");
    await new Promise(resolve => setTimeout(resolve, 5000));
    log.finish = await tab.eval(String.raw`
(() => {
  const d = Array.from(document.querySelectorAll('.weui-desktop-dialog, .weui-desktop-dialog__wrp, .weui-desktop-modal')).find(el => el.offsetParent !== null || el.getClientRects().length) || document;
  const btn = Array.from(d.querySelectorAll('button, a.weui-desktop-btn, .weui-desktop-btn')).find(b => /完成|确定/.test((b.textContent || '').trim()));
  if (!btn) return { ok: false, text: d.textContent.replace(/\s+/g, ' ').trim().slice(0, 500), buttons: Array.from(d.querySelectorAll('button, a.weui-desktop-btn, .weui-desktop-btn')).map(b => (b.textContent || '').trim()).filter(Boolean).slice(0, 20) };
  btn.click();
  return { ok: true, clicked: (btn.textContent || '').trim() };
})()
`);
    log.events.push("clicked_finish");
    await new Promise(resolve => setTimeout(resolve, 3000));
    log.coverState = await tab.eval(String.raw`
(() => {
  const area = document.querySelector('#js_cover_area');
  const preview = area?.querySelector('.js_cover_preview_new, .js_cover_preview_square, [style*="background-image"]');
  const html = area ? area.innerHTML : '';
  return {
    ok: !!area,
    text: area ? area.textContent.replace(/\s+/g, ' ').trim().slice(0, 300) : '',
    hasMmbiz: /mmbiz|mmbiz_qpic|wx_fmt/.test(html),
    hasBgUrl: /background-image:\s*url\((?!['"]?['"]?\))/.test(html),
    previewStyle: preview ? preview.getAttribute('style') || '' : '',
  };
})()
`);
    log.save = await tab.eval(String.raw`
(() => {
  const btn = Array.from(document.querySelectorAll('button, .weui-desktop-btn, a.weui-desktop-btn')).find(b => /保存为草稿|保存/.test((b.textContent || '').trim()));
  if (!btn) return { ok: false };
  btn.click();
  return { ok: true, clicked: (btn.textContent || '').trim() };
})()
`);
    log.ok = !!(log.coverState?.hasMmbiz || log.coverState?.hasBgUrl);
  } finally {
    tab.close();
  }
  await fs.writeFile(LOG_PATH, JSON.stringify(log, null, 2), "utf8");
  console.log(JSON.stringify({ ok: log.ok, log: LOG_PATH, events: log.events, clickDialog: log.clickDialog, dialogAfterClick: log.dialogAfterClick, afterUpload: log.afterUpload, next: log.next, finish: log.finish, coverState: log.coverState, save: log.save }, null, 2));
}

await main();
