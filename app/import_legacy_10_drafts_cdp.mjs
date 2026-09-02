import fs from "node:fs/promises";
import path from "node:path";

const CDP_HTTP = "http://127.0.0.1:9222";
const WORKBUDDY = "C:/Users/www19/WorkBuddy/2026-08-13-23-36-20";
const LOG_PATH = "D:/wechat/logs/cdp_import_legacy_10_drafts.json";
const START_NO = Number(process.env.WECHAT_START_NO || 21);
const COUNT = Number(process.env.WECHAT_COUNT || 10);
const BATCH_MANIFEST = process.env.WECHAT_BATCH_MANIFEST || "";
const TARGET_APPMSGIDS = (process.env.WECHAT_APPMSGIDS || "")
  .split(",")
  .map(x => x.trim())
  .filter(Boolean);

class Tab {
  constructor(wsUrl) {
    this.wsUrl = wsUrl;
    this.nextId = 0;
    this.pending = new Map();
    this.rootNodeId = null;
  }
  async connect() {
    this.ws = new WebSocket(this.wsUrl);
    this.ws.addEventListener("message", event => {
      let msg;
      try { msg = JSON.parse(event.data); } catch { return; }
      if (msg.id && this.pending.has(msg.id)) {
        const p = this.pending.get(msg.id);
        clearTimeout(p.timeout);
        this.pending.delete(msg.id);
        p.resolve(msg);
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
      const timeout = setTimeout(() => {
        this.pending.delete(id);
        resolve({ error: { message: `timeout ${method}` } });
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
    return result?.description || res;
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
    this.rootNodeId = null;
    const nodeId = await this.nodeId(selector);
    if (!nodeId) return { ok: false, error: `not found ${selector}` };
    const abs = path.resolve(filePath);
    const res = await this.cmd("DOM.setFileInputFiles", { nodeId, files: [abs] }, 60000);
    return res?.error ? { ok: false, error: res.error.message || String(res.error) } : { ok: true };
  }
  close() { this.ws?.close(); }
}

async function cdpJson(p) {
  const res = await fetch(`${CDP_HTTP}${p}`);
  if (!res.ok) throw new Error(`CDP ${p} ${res.status}`);
  return await res.json();
}

async function findTokenAndPage() {
  const pages = await cdpJson("/json");
  for (const page of pages) {
    const url = page.url || "";
    const match = url.match(/token=(\d+)/);
    if (match && url.includes("mp.weixin.qq.com")) return { token: match[1], page };
  }
  throw new Error("没有找到已登录的公众号 Chrome/CDP 页面");
}

async function waitFor(tab, expr, timeoutMs = 60000, intervalMs = 1000) {
  const started = Date.now();
  let last = null;
  while (Date.now() - started < timeoutMs) {
    last = await tab.eval(expr, 15000);
    if (last?.ok || last === true) return last;
    await new Promise(resolve => setTimeout(resolve, intervalMs));
  }
  return last || { ok: false, error: "timeout" };
}

async function loadItems() {
  if (BATCH_MANIFEST) {
    const manifestPath = path.resolve(BATCH_MANIFEST);
    const manifest = JSON.parse(await fs.readFile(manifestPath, "utf8"));
    const selected = manifest.slice(0, COUNT || manifest.length);
    const items = [];
    for (const item of selected) {
      const bodyPath = path.resolve(item.body_file);
      const coverPath = path.resolve(item.cover_file);
      const fullHtml = await fs.readFile(bodyPath, "utf8");
      const bodyMatch = fullHtml.match(/<section[^>]*>([\s\S]*)<\/section>/);
      const body = bodyMatch ? bodyMatch[1] : fullHtml;
      await fs.access(coverPath);
      items.push({
        no: item.no,
        title: item.title,
        author: item.author || "真相官",
        digest: item.digest || "",
        bodyPath,
        coverPath,
        bodyChars: body.length,
        body,
      });
    }
    return items;
  }
  const manifestPath = path.join(WORKBUDDY, "富格式", "manifest.json");
  const manifest = JSON.parse(await fs.readFile(manifestPath, "utf8"));
  const selected = manifest.filter(item => item.no >= START_NO && item.no < START_NO + COUNT);
  const items = [];
  for (const item of selected) {
    const no = item.no;
    const day = no <= 25 ? "Day5" : "Day6";
    const idx = ((no - 1) % 5) + 1;
    const bodyPath = path.join(WORKBUDDY, "富格式", item.body_file);
    const dayDir = path.join(WORKBUDDY, "公众号文章", day);
    const files = await fs.readdir(dayDir);
    const coverName = files.find(name => name.startsWith(`${String(idx).padStart(2, "0")}-`) && name.endsWith("-封面.jpg"));
    if (!coverName) throw new Error(`找不到 ${no} 的封面`);
    const coverPath = path.join(dayDir, coverName);
    const body = await fs.readFile(bodyPath, "utf8");
    await fs.access(coverPath);
    items.push({ no, title: item.title, bodyPath, coverPath, bodyChars: body.length, body });
  }
  return items;
}

async function closeKnownDialogs(tab) {
  return await tab.eval(String.raw`
(() => {
  const clicked = [];
  const removed = [];
  for (const d of Array.from(document.querySelectorAll('.weui-desktop-dialog__wrp, .weui-desktop-dialog, .weui-desktop-mask, [role="dialog"]'))) {
    const text = (d.textContent || '').replace(/\s+/g, ' ').trim();
    if (/未授权使用切换账号能力|公众号尚未实名|未设置头像和名称/.test(text) && !/选择图片|上传文件|我的图片|公共图片库/.test(text)) {
      const wrp = d.closest('.weui-desktop-dialog__wrp') || d;
      wrp.remove();
      removed.push(text.slice(0, 40));
    }
  }
  for (const b of Array.from(document.querySelectorAll('button, .weui-desktop-btn, a.weui-desktop-btn')).reverse()) {
    const text = (b.textContent || '').replace(/\s+/g, ' ').trim();
    const visible = !!(b.offsetWidth || b.offsetHeight || b.getClientRects().length);
    if (visible && /我知道了|关闭|暂不|稍后/.test(text) && !/保存|完成|确定|下一步/.test(text)) {
      b.click();
      clicked.push(text);
    }
  }
  return { clicked: clicked.slice(0, 20), removed: removed.slice(0, 20) };
})()
`, 10000);
}

async function waitForEditor(tab) {
  const probe = String.raw`
(() => {
  const editables = Array.from(document.querySelectorAll('[contenteditable="true"]'));
  return {
    ok: !!document.querySelector('#title') && editables.length > 0,
    href: location.href.replace(/token=\d+/g, 'token=***'),
    editableCount: editables.length,
    bodyText: document.body ? document.body.textContent.replace(/\s+/g, ' ').slice(0, 300) : '',
  };
})()
`;
  return await waitFor(tab, probe, 90000, 1500);
}

async function setTitle(tab, title) {
  return await tab.eval(String.raw`
((title) => {
  function fire(el, name) {
    const e = document.createEvent('HTMLEvents');
    e.initEvent(name, true, false);
    el.dispatchEvent(e);
  }
  const input = document.querySelector('#title') || document.querySelector('textarea[placeholder*="标题"], input[placeholder*="标题"]');
  if (!input) return { ok: false, error: 'title input not found' };
  input.focus();
  input.value = title;
  ['input', 'change', 'keyup', 'blur'].forEach(name => fire(input, name));
  return { ok: true, value: input.value };
})(${JSON.stringify(title)})
`, 30000);
}

async function injectBody(tab, bodyHtml) {
  return await tab.eval(String.raw`
((htmlContent) => {
  const editor = document.querySelector('.rich_media_content .ProseMirror') || document.querySelector('#js_editor .ProseMirror') || document.querySelector('.ProseMirror');
  if (!editor) return { ok: false, error: 'body editor not found' };
  editor.focus();
  document.execCommand('selectAll', false, null);
  const clipboard = new DataTransfer();
  clipboard.setData('text/html', htmlContent);
  clipboard.setData('text/plain', new DOMParser().parseFromString(htmlContent, 'text/html').body.innerText);
  editor.dispatchEvent(new ClipboardEvent('paste', { bubbles: true, cancelable: true, clipboardData: clipboard }));
  return {
    ok: true,
    source: 'ClipboardEvent(paste)',
    afterTextLen: (editor.textContent || '').length,
    afterHtmlLen: (editor.innerHTML || '').length,
    imgCount: editor.querySelectorAll('img').length,
    dataImgCount: Array.from(editor.querySelectorAll('img')).filter(img => (img.getAttribute('src') || '').startsWith('data:')).length,
  };
})(${JSON.stringify(bodyHtml)})
`, 60000);
}

async function setMetadata(tab, author, digest) {
  return await tab.eval(String.raw`
((author, digest) => {
  const set = (selector, value) => {
    const el = document.querySelector(selector);
    if (!el || !value) return false;
    el.focus(); el.value = value;
    for (const name of ['input', 'change', 'blur']) el.dispatchEvent(new Event(name, { bubbles: true }));
    return true;
  };
  return { author: set('#author', author), digest: set('#js_description', digest) };
})(${JSON.stringify(author)}, ${JSON.stringify(digest)})
`, 30000);
}

async function setCover(tab, coverPath) {
  await closeKnownDialogs(tab);
  const click = await tab.eval(String.raw`
(() => {
  const area = document.querySelector('#js_cover_area') || document;
  const link = Array.from(area.querySelectorAll('.js_imagedialog, a, button')).find(el => (el.textContent || '').includes('从图片库选择')) ||
    Array.from(document.querySelectorAll('.js_imagedialog')).find(el => el.offsetParent !== null) ||
    document.querySelector('.js_imagedialog');
  if (!link) return { ok: false, error: 'no image dialog link' };
  link.click();
  return { ok: true, text: (link.textContent || '').trim() };
})()
`, 30000);
  if (!click?.ok) return { ok: false, step: "click", click };
  const dialog = await waitFor(tab, String.raw`
(() => ({
  ok: !!document.querySelector('.weui-desktop-dialog input[type="file"], .weui-desktop-dialog__wrp input[type="file"], input[type="file"]') &&
      /选择图片|上传文件|公共图片库|我的图片/.test((document.querySelector('.weui-desktop-dialog, .weui-desktop-dialog__wrp')?.textContent || '')),
  text: (document.querySelector('.weui-desktop-dialog, .weui-desktop-dialog__wrp')?.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 400),
  inputCount: document.querySelectorAll('input[type="file"]').length
}))()
`, 45000);
  if (!dialog?.ok) {
    await closeKnownDialogs(tab);
    const retryClick = await tab.eval(String.raw`
(() => {
  const area = document.querySelector('#js_cover_area') || document;
  const link = Array.from(area.querySelectorAll('.js_imagedialog, a, button')).find(el => (el.textContent || '').includes('从图片库选择')) ||
    Array.from(document.querySelectorAll('.js_imagedialog')).find(el => el.offsetParent !== null) ||
    document.querySelector('.js_imagedialog');
  if (!link) return { ok: false, error: 'no image dialog link on retry' };
  link.click();
  return { ok: true, text: (link.textContent || '').trim() };
})()
`, 30000);
    const retryDialog = await waitFor(tab, String.raw`
(() => ({
  ok: !!document.querySelector('.weui-desktop-dialog input[type="file"], .weui-desktop-dialog__wrp input[type="file"], input[type="file"]') &&
      /选择图片|上传文件|公共图片库|我的图片/.test((document.querySelector('.weui-desktop-dialog, .weui-desktop-dialog__wrp')?.textContent || '')),
  text: (document.querySelector('.weui-desktop-dialog, .weui-desktop-dialog__wrp')?.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 400),
  inputCount: document.querySelectorAll('input[type="file"]').length
}))()
`, 45000);
    if (!retryDialog?.ok) return { ok: false, step: "dialog", dialog, retryClick, retryDialog };
  }
  const setFile = await tab.setFile('.weui-desktop-dialog input[type="file"], .weui-desktop-dialog__wrp input[type="file"], input[type="file"]', coverPath);
  if (!setFile?.ok) return { ok: false, step: "set_file", setFile };
  await new Promise(resolve => setTimeout(resolve, 6000));
  const selectUploaded = await tab.eval(String.raw`
(() => {
  const d = Array.from(document.querySelectorAll('.weui-desktop-dialog, .weui-desktop-dialog__wrp, .weui-desktop-modal'))
    .filter(el => el.offsetParent !== null || el.getClientRects().length)
    .find(el => /选择图片|上传文件|公共图片库|我的图片/.test(el.textContent || '')) || document;
  const items = Array.from(d.querySelectorAll('.weui-desktop-img-picker__item'))
    .filter(el => !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length));
  const item = items[0];
  if (!item) return { ok: false, error: 'no uploaded image item' };
  item.click();
  return { ok: true, text: (item.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 120), count: items.length };
})()
`, 30000);
  await new Promise(resolve => setTimeout(resolve, 1500));
  const choose = await tab.eval(String.raw`
(() => {
  const d = Array.from(document.querySelectorAll('.weui-desktop-dialog, .weui-desktop-dialog__wrp, .weui-desktop-modal'))
    .filter(el => el.offsetParent !== null || el.getClientRects().length)
    .find(el => /选择图片|上传文件|公共图片库|我的图片/.test(el.textContent || '')) || document;
  const buttons = Array.from(d.querySelectorAll('.weui-desktop-dialog__ft button, .weui-desktop-dialog__ft .weui-desktop-btn, button, a.weui-desktop-btn, .weui-desktop-btn'))
    .filter(b => !!(b.offsetWidth || b.offsetHeight || b.getClientRects().length))
    .filter(b => !String(b.className || '').includes('disabled') && !b.disabled);
  const btn = buttons.find(b => /(下一步)/.test((b.textContent || '').trim())) ||
    buttons.find(b => /^确定$/.test((b.textContent || '').trim()));
  if (!btn) return { ok: false, buttons: Array.from(d.querySelectorAll('button, a.weui-desktop-btn, .weui-desktop-btn')).map(b => (b.textContent || '').trim()).filter(Boolean).slice(0, 20) };
  btn.click();
  return { ok: true, clicked: (btn.textContent || '').trim() };
})()
`, 30000);
  if (!choose?.ok) return { ok: false, step: "choose", selectUploaded, choose };
  await new Promise(resolve => setTimeout(resolve, 5000));
  const finish = await tab.eval(String.raw`
(() => {
  const d = Array.from(document.querySelectorAll('.weui-desktop-dialog, .weui-desktop-dialog__wrp, .weui-desktop-modal'))
    .filter(el => el.offsetParent !== null || el.getClientRects().length)
    .find(el => /裁剪|封面|完成|确定/.test(el.textContent || '')) || document;
  const buttons = Array.from(d.querySelectorAll('.weui-desktop-dialog__ft button, .weui-desktop-dialog__ft .weui-desktop-btn, button, a.weui-desktop-btn, .weui-desktop-btn'))
    .filter(b => !!(b.offsetWidth || b.offsetHeight || b.getClientRects().length));
  const btn = buttons.find(b => /^完成$/.test((b.textContent || '').trim())) ||
    buttons.find(b => /^确认$/.test((b.textContent || '').trim())) ||
    buttons.find(b => /^确定$/.test((b.textContent || '').trim()));
  if (!btn) return { ok: false, text: d.textContent.replace(/\s+/g, ' ').trim().slice(0, 400), buttons: Array.from(d.querySelectorAll('button, a.weui-desktop-btn, .weui-desktop-btn')).map(b => (b.textContent || '').trim()).filter(Boolean).slice(0, 20) };
  btn.click();
  return { ok: true, clicked: (btn.textContent || '').trim() };
})()
`, 30000);
  await new Promise(resolve => setTimeout(resolve, 3000));
  const state = await tab.eval(String.raw`
(() => {
  const area = document.querySelector('#js_cover_area');
  const html = area ? area.innerHTML : '';
  const preview = area?.querySelector('.js_cover_preview_new, .js_cover_preview_square, [style*="background-image"]');
  return {
    ok: !!area,
    hasMmbiz: /mmbiz|mmbiz_qpic|wx_fmt/.test(html),
    hasBgUrl: /background-image:\s*url\((?!['"]?['"]?\))/.test(html),
    previewStyle: preview ? (preview.getAttribute('style') || '').slice(0, 220) : '',
  };
})()
`, 30000);
  return { ok: !!(state?.hasMmbiz || state?.hasBgUrl), click, dialog, setFile, selectUploaded, choose, finish, state };
}

async function saveDraft(tab) {
  return await tab.eval(String.raw`
(() => {
  const btn = Array.from(document.querySelectorAll('button, .weui-desktop-btn, a.weui-desktop-btn')).find(b => /保存为草稿|保存/.test((b.textContent || '').replace(/\s+/g, ' ').trim()));
  if (!btn) return { ok: false, buttons: Array.from(document.querySelectorAll('button, .weui-desktop-btn, a.weui-desktop-btn')).map(b => (b.textContent || '').replace(/\s+/g, ' ').trim()).filter(Boolean).slice(0, 40) };
  btn.click();
  return { ok: true, clicked: (btn.textContent || '').replace(/\s+/g, ' ').trim() };
})()
`, 30000);
}

async function pageState(tab) {
  return await tab.eval(String.raw`
(() => {
  const editables = Array.from(document.querySelectorAll('[contenteditable="true"]')).map((el, index) => ({
    index,
    textLen: (el.textContent || '').length,
    htmlLen: (el.innerHTML || '').length,
    imgCount: el.querySelectorAll('img').length,
    dataImgCount: Array.from(el.querySelectorAll('img')).filter(img => (img.getAttribute('src') || '').startsWith('data:')).length,
    mmbizImgCount: Array.from(el.querySelectorAll('img')).filter(img => (img.getAttribute('src') || '').includes('mmbiz')).length,
    head: (el.textContent || '').replace(/\s+/g, ' ').slice(0, 180),
  }));
  const area = document.querySelector('#js_cover_area');
  const coverHtml = area ? area.innerHTML : '';
  return {
    href: location.href.replace(/token=\d+/g, 'token=***'),
    appmsgid: (location.href.match(/appmsgid=(\d+)/) || [])[1] || '',
    title: document.querySelector('#title')?.value || '',
    bestEditable: editables.sort((a, b) => b.textLen - a.textLen)[0] || null,
    cover: {
      hasMmbiz: /mmbiz|mmbiz_qpic|wx_fmt/.test(coverHtml),
      hasBgUrl: /background-image:\s*url\((?!['"]?['"]?\))/.test(coverHtml),
    },
    dialogs: Array.from(document.querySelectorAll('.weui-desktop-dialog, .weui-desktop-dialog__wrp, [role="dialog"]')).map(el => (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 160)).filter(Boolean).slice(0, 10),
  };
})()
`, 30000);
}

async function importOne(tab, token, item, targetAppmsgid = "") {
  const result = { no: item.no, title: item.title, bodyPath: item.bodyPath, coverPath: item.coverPath, ok: false, startedAt: new Date().toISOString() };
  const editUrl = targetAppmsgid
    ? `https://mp.weixin.qq.com/cgi-bin/appmsg?t=media/appmsg_edit&action=edit&reprint_confirm=0&type=77&appmsgid=${targetAppmsgid}&token=${token}&lang=zh_CN&timestamp=${Date.now()}`
    : `https://mp.weixin.qq.com/cgi-bin/appmsg?t=media/appmsg_edit_v2&action=edit&isNew=1&type=77&token=${token}&lang=zh_CN`;
  if (targetAppmsgid) result.targetAppmsgid = targetAppmsgid;
  await tab.cmd("Page.navigate", { url: editUrl }, 30000);
  result.editor = await waitForEditor(tab);
  await closeKnownDialogs(tab);
  result.setTitle = await setTitle(tab, item.title);
  result.setMetadata = await setMetadata(tab, item.author, item.digest);
  result.inject = await injectBody(tab, item.body);
  await new Promise(resolve => setTimeout(resolve, 4000));
  result.cover = await setCover(tab, item.coverPath);
  result.save = await saveDraft(tab);
  await new Promise(resolve => setTimeout(resolve, 8000));
  result.afterSave = await pageState(tab);
  result.appmsgid = result.afterSave?.appmsgid || "";
  result.ok = !!(
    result.setTitle?.ok &&
    result.inject?.ok &&
    result.cover?.ok &&
    result.save?.ok &&
    result.appmsgid &&
    result.afterSave?.title === item.title &&
    (result.afterSave?.bestEditable?.textLen || 0) > 500 &&
    result.afterSave?.cover?.hasMmbiz
  );
  result.finishedAt = new Date().toISOString();
  return result;
}

async function main() {
  await fs.mkdir("D:/wechat/logs", { recursive: true });
  const items = await loadItems();
  const { token, page } = await findTokenAndPage();
  const tab = new Tab(page.webSocketDebuggerUrl);
  await tab.connect();
  const log = { ok: false, startNo: START_NO, count: COUNT, results: [] };
  try {
    await tab.cmd("Page.enable");
    await tab.cmd("Runtime.enable");
    await tab.cmd("DOM.enable");
    for (const [index, item] of items.entries()) {
      console.log(`\n[${item.no}] ${item.title}`);
      const result = await importOne(tab, token, item, TARGET_APPMSGIDS[index] || "");
      log.results.push(result);
      await fs.writeFile(LOG_PATH, JSON.stringify(log, null, 2), "utf8");
      console.log(JSON.stringify({
        no: result.no,
        ok: result.ok,
        appmsgid: result.appmsgid,
        title: result.afterSave?.title,
        textLen: result.afterSave?.bestEditable?.textLen,
        cover: result.afterSave?.cover,
        bodyImages: result.afterSave?.bestEditable ? {
          imgCount: result.afterSave.bestEditable.imgCount,
          dataImgCount: result.afterSave.bestEditable.dataImgCount,
          mmbizImgCount: result.afterSave.bestEditable.mmbizImgCount,
        } : null,
      }, null, 2));
    }
    log.ok = log.results.length === items.length && log.results.every(r => r.ok);
  } finally {
    tab.close();
  }
  await fs.writeFile(LOG_PATH, JSON.stringify(log, null, 2), "utf8");
  console.log("\nSUMMARY");
  console.log(JSON.stringify({
    ok: log.ok,
    log: LOG_PATH,
    done: log.results.filter(r => r.ok).length,
    total: items.length,
    drafts: log.results.map(r => ({ no: r.no, ok: r.ok, appmsgid: r.appmsgid, title: r.title })),
  }, null, 2));
}

await main();
