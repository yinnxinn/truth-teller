import fs from "node:fs/promises";

const CDP_HTTP = "http://127.0.0.1:9222";
const APPMSGID = "100000096";
const ARTICLE_HTML =
  "D:/wechat/content/drafts/2026-08-15-ai评分裁员/真相官-AI不会先裁掉你它会先把你打成一个分数-公众号-微信版.html";
const LOG_PATH = "D:/wechat/logs/cdp_inject_current_article.json";

class Tab {
  constructor(wsUrl) {
    this.wsUrl = wsUrl;
    this.nextId = 0;
    this.pending = new Map();
  }

  async connect() {
    this.ws = new WebSocket(this.wsUrl);
    this.ws.addEventListener("message", (event) => {
      let message;
      try {
        message = JSON.parse(event.data);
      } catch {
        return;
      }
      if (message.id && this.pending.has(message.id)) {
        const { resolve, timeout } = this.pending.get(message.id);
        clearTimeout(timeout);
        this.pending.delete(message.id);
        resolve(message);
      }
    });
    await new Promise((resolve, reject) => {
      this.ws.addEventListener("open", resolve, { once: true });
      this.ws.addEventListener("error", reject, { once: true });
    });
  }

  cmd(method, params = {}, timeoutMs = 60000) {
    const id = ++this.nextId;
    const payload = JSON.stringify({ id, method, params });
    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        this.pending.delete(id);
        resolve({ error: { message: `timeout calling ${method}` } });
      }, timeoutMs);
      this.pending.set(id, { resolve, timeout });
      this.ws.send(payload);
    });
  }

  async eval(expression, timeoutMs = 60000) {
    const response = await this.cmd(
      "Runtime.evaluate",
      {
        expression,
        returnByValue: true,
        awaitPromise: true,
        userGesture: true,
      },
      timeoutMs,
    );
    const result = response?.result?.result;
    if (result && Object.hasOwn(result, "value")) return result.value;
    if (result?.description) return { description: result.description };
    return response;
  }

  close() {
    this.ws?.close();
  }
}

async function cdpJson(path) {
  const response = await fetch(`${CDP_HTTP}${path}`);
  if (!response.ok) throw new Error(`CDP ${path} returned ${response.status}`);
  return await response.json();
}

async function findTokenAndPage() {
  const pages = await cdpJson("/json");
  for (const page of pages) {
    const url = page.url || "";
    const match = url.match(/token=(\d+)/);
    if (match && url.includes("mp.weixin.qq.com")) {
      return { token: match[1], page };
    }
  }
  throw new Error("未在 9222 的 Chrome 页面中找到公众号 token");
}

async function extractArticle() {
  const fullHtml = await fs.readFile(ARTICLE_HTML, "utf8");
  const titleMatch = fullHtml.match(/<title>(.*?)<\/title>/);
  const bodyMatch = fullHtml.match(/<section[^>]*>([\s\S]*)<\/section>/);
  const title = (titleMatch?.[1] || "真相官 | AI不会先裁掉你，它会先把你打成一个分数")
    .replace(/^真相官\s*\|\s*/, "")
    .trim();
  const body = bodyMatch ? bodyMatch[1] : fullHtml;
  return { title, body };
}

async function waitForEditor(tab, timeoutMs = 90000) {
  const probeJs = String.raw`
(() => {
  const editables = Array.from(document.querySelectorAll('[contenteditable="true"]'));
  const body = document.body ? document.body.textContent.replace(/\s+/g, ' ').slice(0, 240) : '';
  return {
    href: location.href,
    titleInput: !!document.querySelector('#title'),
    editableCount: editables.length,
    longestEditableText: editables.reduce((m, el) => Math.max(m, (el.textContent || '').length), 0),
    body
  };
})()
`;
  const started = Date.now();
  let last = null;
  while (Date.now() - started < timeoutMs) {
    last = await tab.eval(probeJs, 20000);
    if (last?.titleInput && last?.editableCount > 0) return last;
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
  throw new Error(`编辑器未加载：${JSON.stringify(last)}`);
}

async function injectArticle(tab, bodyHtml) {
  const injectJs = String.raw`
((htmlContent) => {
  function fire(el, name) {
    let event;
    try {
      event = new InputEvent(name, { bubbles: true, cancelable: true, inputType: 'insertHTML', data: '' });
    } catch (_) {
      event = document.createEvent('HTMLEvents');
      event.initEvent(name, true, false);
    }
    el.dispatchEvent(event);
  }

  const candidates = [];
  const add = (el, source) => {
    if (!el) return;
    candidates.push({
      el,
      source,
      textLen: (el.textContent || '').trim().length,
      htmlLen: (el.innerHTML || '').length,
      className: String(el.className || '').slice(0, 120)
    });
  };

  add(document.querySelector('.rich_media_content .ProseMirror'), '.rich_media_content .ProseMirror');
  add(document.querySelector('#js_editor .ProseMirror'), '#js_editor .ProseMirror');
  add(document.querySelector('#js_editor [contenteditable="true"]'), '#js_editor [contenteditable]');
  add(document.querySelector('.ProseMirror'), '.ProseMirror');
  add(document.querySelector('#ueditor_0'), '#ueditor_0');
  add(document.querySelector('.edui-body-container'), '.edui-body-container');
  document.querySelectorAll('[contenteditable="true"]').forEach((el, idx) => add(el, 'contenteditable:' + idx));

  const unique = [];
  const seen = new Set();
  for (const item of candidates) {
    if (seen.has(item.el)) continue;
    seen.add(item.el);
    unique.push(item);
  }

  const bodyCandidates = unique.filter(item => item.textLen > 100 || item.htmlLen > 1000);
  const chosen = (bodyCandidates.length ? bodyCandidates : unique)
    .sort((a, b) => b.textLen - a.textLen)[0];
  if (!chosen) return { success: false, error: 'editor not found', candidates: [] };

  const editor = chosen.el;
  editor.focus();
  editor.innerHTML = htmlContent;
  ['beforeinput', 'input', 'change', 'keyup', 'mouseup', 'paste', 'compositionend', 'blur']
    .forEach(name => fire(editor, name));

  return {
    success: true,
    chosen: {
      source: chosen.source,
      textLenBefore: chosen.textLen,
      htmlLenBefore: chosen.htmlLen,
      className: chosen.className
    },
    candidates: unique.map(item => ({
      source: item.source,
      textLen: item.textLen,
      htmlLen: item.htmlLen,
      className: item.className
    })).slice(0, 12),
    afterTextLen: (editor.textContent || '').length,
    afterHtmlLen: (editor.innerHTML || '').length,
    hasOldDate: (editor.textContent || '').includes('2026-08-15'),
    hasNewJudge: (editor.textContent || '').includes('这篇原文真正值得追问的'),
    hasTruthLabel: (editor.textContent || '').includes('真相一句话'),
    imgCount: editor.querySelectorAll('img').length,
    dataImgCount: Array.from(editor.querySelectorAll('img')).filter(img => (img.getAttribute('src') || '').startsWith('data:')).length
  };
})
`;
  return await tab.eval(`${injectJs}(${JSON.stringify(bodyHtml)})`, 60000);
}

async function setTitle(tab, title) {
  const setTitleJs = String.raw`
((title) => {
  function fire(el, name) {
    const event = document.createEvent('HTMLEvents');
    event.initEvent(name, true, false);
    el.dispatchEvent(event);
  }
  const input = document.querySelector('#title') ||
    document.querySelector('textarea[placeholder*="标题"]') ||
    document.querySelector('input[placeholder*="标题"]');
  if (input) {
    input.focus();
    input.value = title;
    ['input', 'change', 'keyup', 'blur'].forEach(name => fire(input, name));
    return { success: true, target: input.tagName, value: input.value.slice(0, 80) };
  }
  const editables = Array.from(document.querySelectorAll('[contenteditable="true"]'))
    .sort((a, b) => (a.textContent || '').length - (b.textContent || '').length);
  const titleEl = editables.find(el => (el.textContent || '').length < 120) || editables[0];
  if (!titleEl) return { success: false, error: 'title element not found' };
  titleEl.focus();
  titleEl.textContent = title;
  ['input', 'change', 'keyup', 'blur'].forEach(name => fire(titleEl, name));
  return { success: true, target: 'contenteditable', value: titleEl.textContent.slice(0, 80) };
})
`;
  return await tab.eval(`${setTitleJs}(${JSON.stringify(title)})`, 30000);
}

async function saveDraft(tab) {
  const saveJs = String.raw`
(() => {
  const buttons = Array.from(document.querySelectorAll('button, .weui-desktop-btn, a.weui-desktop-btn'));
  const save = buttons.find(btn => {
    const text = (btn.textContent || '').trim();
    return text.includes('保存为草稿') || text.includes('存为草稿') || text === '保存';
  });
  if (!save) {
    return { success: false, buttons: buttons.map(b => (b.textContent || '').trim()).filter(Boolean).slice(0, 30) };
  }
  save.click();
  return { success: true, clicked: (save.textContent || '').trim() };
})()
`;
  return await tab.eval(saveJs, 30000);
}

async function postSaveStatus(tab) {
  const statusJs = String.raw`
(() => {
  const text = document.body ? document.body.textContent.replace(/\s+/g, ' ').slice(0, 1200) : '';
  const dialogs = Array.from(document.querySelectorAll('.weui-desktop-dialog, .weui-desktop-modal, .dialog_wrp'))
    .map(d => d.textContent.replace(/\s+/g, ' ').slice(0, 160));
  const toasts = Array.from(document.querySelectorAll('.weui-desktop-toast, .tips_global, .tool_bar_tips'))
    .map(t => t.textContent.replace(/\s+/g, ' ').slice(0, 160));
  const editables = Array.from(document.querySelectorAll('[contenteditable="true"]'))
    .map(el => ({ len: (el.textContent || '').length, head: (el.textContent || '').slice(0, 120) }));
  return {
    href: location.href,
    dialogs,
    toasts,
    hasOldDate: text.includes('2026-08-15'),
    hasNewJudge: text.includes('这篇原文真正值得追问的'),
    hasTruthLabel: text.includes('真相一句话'),
    editables
  };
})()
`;
  return await tab.eval(statusJs, 20000);
}

async function main() {
  await fs.mkdir("D:/wechat/logs", { recursive: true });
  const log = {
    ok: false,
    step: "start",
    article: ARTICLE_HTML,
    appmsgid: APPMSGID,
    events: [],
  };

  try {
    const { token, page } = await findTokenAndPage();
    const article = await extractArticle();
    const bodyHtml = article.body;
    log.title = article.title;
    log.bodyChars = bodyHtml.length;
    log.bodyHasDate = bodyHtml.includes("2026-08-15");

    const tab = new Tab(page.webSocketDebuggerUrl);
    await tab.connect();
    try {
      await tab.cmd("Page.enable");
      await tab.cmd("Runtime.enable");
      const editUrls = [
        "https://mp.weixin.qq.com/cgi-bin/appmsg" +
          `?t=media/appmsg_edit_v2&action=edit&isNew=1&type=77` +
          `&token=${token}&lang=zh_CN`,
        "https://mp.weixin.qq.com/cgi-bin/appmsg" +
          `?t=media/appmsg_edit_v2&action=edit&isNew=0&type=77` +
          `&appmsgid=${APPMSGID}&token=${token}&lang=zh_CN`,
        "https://mp.weixin.qq.com/cgi-bin/appmsg" +
          `?t=media/appmsg_edit&action=edit&reprint_confirm=0&type=77` +
          `&appmsgid=${APPMSGID}&token=${token}&lang=zh_CN&timestamp=${Date.now()}`,
      ];

      let editorProbe = null;
      const loadErrors = [];
      for (const editUrl of editUrls) {
        await tab.cmd("Page.navigate", { url: editUrl }, 30000);
        log.events.push(`navigate_editor_${loadErrors.length + 1}`);
        await fs.writeFile(LOG_PATH, JSON.stringify(log, null, 2), "utf8");
        try {
          editorProbe = await waitForEditor(tab, 60000);
          break;
        } catch (error) {
          loadErrors.push(String(error?.message || error));
          log.loadErrors = loadErrors;
          await fs.writeFile(LOG_PATH, JSON.stringify(log, null, 2), "utf8");
        }
      }
      if (!editorProbe) throw new Error(`编辑器未加载，已尝试 ${editUrls.length} 个 URL：${loadErrors.join(" | ")}`);
      log.loadProbe = editorProbe;
      log.events.push("editor_ready");
      await fs.writeFile(LOG_PATH, JSON.stringify(log, null, 2), "utf8");

      log.setTitle = await setTitle(tab, article.title);
      log.events.push("title_set");
      await fs.writeFile(LOG_PATH, JSON.stringify(log, null, 2), "utf8");

      log.inject = await injectArticle(tab, bodyHtml);
      log.events.push("inject_done");
      await fs.writeFile(LOG_PATH, JSON.stringify(log, null, 2), "utf8");

      await new Promise((resolve) => setTimeout(resolve, 2000));
      log.saveClick = await saveDraft(tab);
      log.events.push("save_clicked");
      await fs.writeFile(LOG_PATH, JSON.stringify(log, null, 2), "utf8");

      await new Promise((resolve) => setTimeout(resolve, 5000));
      log.postSave = await postSaveStatus(tab);
      log.ok = true;
      log.step = "done";
    } finally {
      tab.close();
    }
  } catch (error) {
    log.step = "error";
    log.error = error?.stack || String(error);
  }

  await fs.writeFile(LOG_PATH, JSON.stringify(log, null, 2), "utf8");
  const summary = {
    ok: log.ok,
    step: log.step,
    events: log.events,
    bodyChars: log.bodyChars,
    inject: log.inject,
    saveClick: log.saveClick,
    postSave: log.postSave,
    log: LOG_PATH,
  };
  console.log(JSON.stringify(summary, null, 2));
}

await main();
