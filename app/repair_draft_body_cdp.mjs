import fs from "node:fs/promises";

const DRAFT_ID = process.env.WECHAT_DRAFT_ID || "100000326";
const BODY_FILE = process.env.WECHAT_BODY_FILE || "D:/wechat/content/drafts/2026-08-17-ai-creators-stop/article_body.html";
const pages = await (await fetch("http://127.0.0.1:9222/json")).json();
const page = pages.find(item => (item.url || "").includes("mp.weixin.qq.com"));
if (!page) throw new Error("logged-in WeChat page not found");
const token = (page.url.match(/token=(\d+)/) || [])[1];
if (!token) throw new Error("WeChat token not found");

const bodyHtml = (await fs.readFile(BODY_FILE, "utf8"))
  .replace(/^\s*<section[^>]*>/i, "")
  .replace(/<\/section>\s*$/i, "");

const ws = new WebSocket(page.webSocketDebuggerUrl);
const pending = new Map();
let sequence = 0;
ws.addEventListener("message", event => {
  const message = JSON.parse(event.data);
  const resolve = pending.get(message.id);
  if (resolve) { pending.delete(message.id); resolve(message); }
});
await new Promise((resolve, reject) => {
  ws.addEventListener("open", resolve, { once: true });
  ws.addEventListener("error", reject, { once: true });
});
const command = (method, params = {}) => new Promise(resolve => {
  const id = ++sequence;
  pending.set(id, resolve);
  ws.send(JSON.stringify({ id, method, params }));
});
const evaluate = async expression => {
  const result = await command("Runtime.evaluate", {
    expression,
    returnByValue: true,
    awaitPromise: true,
    userGesture: true,
  });
  return result?.result?.result?.value;
};

await command("Page.navigate", {
  url: `https://mp.weixin.qq.com/cgi-bin/appmsg?t=media/appmsg_edit&action=edit&type=77&appmsgid=${DRAFT_ID}&token=${token}&lang=zh_CN`,
});
await new Promise(resolve => setTimeout(resolve, 7000));

const injected = await evaluate(`
(() => {
  const html = ${JSON.stringify(bodyHtml)};
  const editor = document.querySelector('.rich_media_content .ProseMirror') || document.querySelector('#js_editor .ProseMirror');
  if (!editor) return { ok: false, error: 'editor not found' };
  editor.focus();
  document.execCommand('selectAll', false, null);
  const clipboard = new DataTransfer();
  clipboard.setData('text/html', html);
  clipboard.setData('text/plain', new DOMParser().parseFromString(html, 'text/html').body.innerText);
  const inserted = editor.dispatchEvent(new ClipboardEvent('paste', {
    bubbles: true,
    cancelable: true,
    clipboardData: clipboard,
  }));
  const save = Array.from(document.querySelectorAll('button,a,.weui-desktop-btn')).find(el => (el.textContent || '').trim().includes('保存为草稿') && (el.offsetWidth || el.offsetHeight));
  if (!save) return { ok: false, inserted, error: 'save button not found', textLength: (editor.textContent || '').trim().length };
  save.click();
  return { ok: true, inserted, textLength: (editor.textContent || '').trim().length, htmlLength: (editor.innerHTML || '').length };
})()
`);

await new Promise(resolve => setTimeout(resolve, 5000));
ws.close();
if (!injected?.ok) throw new Error(JSON.stringify(injected));
console.log(JSON.stringify(injected));
