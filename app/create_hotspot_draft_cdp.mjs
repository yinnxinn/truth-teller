import fs from "node:fs/promises";
import path from "node:path";

const manifestPath = process.env.WECHAT_HOTSPOT_MANIFEST || "D:/wechat/content/drafts/2026-08-18-multi-hotspots/hotspot_manifest.json";
const itemIndex = Number(process.env.WECHAT_HOTSPOT_INDEX || 0);
const existingDraftId = process.env.WECHAT_EXISTING_DRAFT_ID || "";
const manifest = JSON.parse(await fs.readFile(manifestPath, "utf8"));
const item = manifest[itemIndex];
if (!item) throw new Error(`No article at manifest index ${itemIndex}`);
let body = (await fs.readFile(item.body_file, "utf8")).replace(/^\s*<section[^>]*>/i, "").replace(/<\/section>\s*$/i, "");
for (const [marker, imagePath] of Object.entries(item.inline_images || {})) {
  const ext = path.extname(imagePath).toLowerCase() === ".png" ? "png" : "jpeg";
  const dataUri = `data:image/${ext};base64,${(await fs.readFile(imagePath)).toString("base64")}`;
  body = body.replaceAll(`{{${marker}}}`, dataUri);
}

const pages = await (await fetch("http://127.0.0.1:9222/json")).json();
const page = pages.find(p => /mp\.weixin\.qq\.com\/cgi-bin\/home\?.*token=\d+/.test(p.url || ""))
  || pages.find(p => /mp\.weixin\.qq\.com\/cgi-bin\/appmsg\?.*action=list_card.*token=\d+/.test(p.url || ""))
  || pages.find(p => (p.url || "").includes("mp.weixin.qq.com") && /token=\d+/.test(p.url || ""))
  || pages.find(p => (p.url || "").includes("mp.weixin.qq.com"));
const token = page?.url?.match(/token=(\d+)/)?.[1];
if (!page || !token) throw new Error("No logged-in WeChat tab found");

const ws = new WebSocket(page.webSocketDebuggerUrl);
let sequence = 0;
const pending = new Map();
ws.addEventListener("message", event => {
  const message = JSON.parse(event.data);
  const resolve = pending.get(message.id);
  if (resolve) { pending.delete(message.id); resolve(message); }
});
await new Promise((resolve, reject) => { ws.addEventListener("open", resolve, { once: true }); ws.addEventListener("error", reject, { once: true }); });
const cmd = (method, params = {}) => new Promise((resolve, reject) => {
  const id = ++sequence;
  const timer = setTimeout(() => { pending.delete(id); reject(new Error(`Timeout: ${method}`)); }, 45000);
  pending.set(id, message => { clearTimeout(timer); resolve(message); });
  ws.send(JSON.stringify({ id, method, params }));
});
const evaluate = async expression => (await cmd("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true, userGesture: true })).result?.result?.value;
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
async function until(expression, label) {
  for (let i = 0; i < 45; i++) { if (await evaluate(expression)) return; await wait(700); }
  const debug = await evaluate("JSON.stringify({href:location.href,title:document.title,text:(document.body?.innerText||'').slice(0,700)})");
  throw new Error(`Timed out waiting for ${label}: ${debug}`);
}
async function typeInto(selector, text) {
  if (!text) return true;
  const focused = await evaluate(`(() => { const el = document.querySelector(${JSON.stringify(selector)}); if (!el) return false; el.focus(); return true; })()`);
  if (!focused) return false;
  await evaluate(`(() => { const el = document.querySelector(${JSON.stringify(selector)}); if (!el) return false; if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) { const setter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el), 'value').set; setter.call(el, ''); } else { el.textContent = ''; } el.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'deleteContentBackward' })); el.dispatchEvent(new Event('change', { bubbles: true })); return true; })()`);
  await cmd("Input.dispatchKeyEvent", { type: "keyDown", key: "a", code: "KeyA", windowsVirtualKeyCode: 65, nativeVirtualKeyCode: 65, modifiers: 2, commands: ["SelectAll"] });
  await cmd("Input.dispatchKeyEvent", { type: "keyUp", windowsVirtualKeyCode: 65, modifiers: 2 });
  await cmd("Input.insertText", { text });
  await wait(300);
  if (selector === ".title-editor-overlay .ProseMirror") {
    await evaluate(`((text) => {
      const el = document.querySelector('#title');
      if (!el) return false;
      const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set;
      setter.call(el, text);
      el.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: text }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
      return el.value === text;
    })(${JSON.stringify(text)})`);
  }
  return true;
}

const editUrl = existingDraftId
  ? `https://mp.weixin.qq.com/cgi-bin/appmsg?t=media/appmsg_edit&action=edit&reprint_confirm=0&type=77&appmsgid=${existingDraftId}&token=${token}&lang=zh_CN`
  : `https://mp.weixin.qq.com/cgi-bin/appmsg?t=media/appmsg_edit_v2&action=edit&isNew=1&type=77&createType=0&token=${token}&lang=zh_CN`;
await cmd("Page.navigate", { url: editUrl });
await until("!!document.querySelector('#title') && !!document.querySelector('.rich_media_content .ProseMirror')", "editor");
await typeInto(".title-editor-overlay .ProseMirror", item.title);
await typeInto("#author", item.author || "真相官");
await typeInto("#js_description", item.digest || "");
await evaluate(`(() => { document.querySelector('.rich_media_content .ProseMirror').focus(); return true; })()`);
await evaluate(`(() => { const editor = document.querySelector('.rich_media_content .ProseMirror'); if (!editor) return false; editor.innerHTML = ''; editor.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'deleteContentBackward' })); return true; })()`);
await cmd("Input.dispatchKeyEvent", { type: "keyDown", key: "a", code: "KeyA", windowsVirtualKeyCode: 65, nativeVirtualKeyCode: 65, modifiers: 2, commands: ["SelectAll"] });
await cmd("Input.dispatchKeyEvent", { type: "keyUp", key: "a", code: "KeyA", windowsVirtualKeyCode: 65, nativeVirtualKeyCode: 65, modifiers: 2 });
const pasted = await evaluate(`(() => {
  const editor = document.querySelector('.rich_media_content .ProseMirror');
  const data = new DataTransfer(); data.setData('text/html', ${JSON.stringify(body)}); data.setData('text/plain', new DOMParser().parseFromString(${JSON.stringify(body)}, 'text/html').body.innerText);
  editor.dispatchEvent(new ClipboardEvent('paste', { bubbles: true, cancelable: true, clipboardData: data }));
  return (editor.textContent || '').trim().length;
})()`);
if (pasted < 200) throw new Error(`Body paste failed: ${pasted}`);

const opened = await evaluate(`(() => { const el = document.querySelector('#js_cover_area .js_imagedialog') || document.querySelector('.js_imagedialog'); if (!el) return false; el.click(); return true; })()`);
if (!opened) throw new Error("Cover selector not found");
await until("!!document.querySelector('.weui-desktop-dialog input[type=file], input[type=file]')", "cover picker");
const doc = await cmd("DOM.getDocument", { depth: 0 });
const input = await cmd("DOM.querySelector", { nodeId: doc.result.root.nodeId, selector: ".weui-desktop-dialog input[type=file], input[type=file]" });
await cmd("DOM.setFileInputFiles", { nodeId: input.result.nodeId, files: [path.resolve(item.cover_file)] });
await wait(6000);
const selectedCover = await evaluate(`(() => {
  const dialog = Array.from(document.querySelectorAll('.weui-desktop-dialog, .weui-desktop-dialog__wrp, .weui-desktop-modal')).find(x => x.offsetParent) || document;
  const thumb = Array.from(dialog.querySelectorAll('.weui-desktop-img-picker__img-thumb')).find(x => x.offsetParent);
  if (!thumb) return false;
  (thumb.closest('li,a,div') || thumb).click();
  return true;
})()`);
if (!selectedCover) throw new Error("Uploaded cover was not selectable");
await wait(500);
await evaluate(`(() => {
  const dialog = Array.from(document.querySelectorAll('.weui-desktop-dialog, .weui-desktop-dialog__wrp, .weui-desktop-modal')).find(x => x.offsetParent) || document;
  const b = Array.from(dialog.querySelectorAll('button,a,.weui-desktop-btn')).find(x => (x.textContent || '').trim() === '下一步' && x.offsetParent);
  if (!b) return false; b.click(); return true;
})()`);
await wait(5000);
await evaluate(`(() => {
  const dialog = Array.from(document.querySelectorAll('.weui-desktop-dialog, .weui-desktop-dialog__wrp, .weui-desktop-modal')).find(x => x.offsetParent) || document;
  const b = Array.from(dialog.querySelectorAll('button,a,.weui-desktop-btn')).find(x => ['确认','完成','确定'].includes((x.textContent || '').trim()) && x.offsetParent);
  if (!b) return false; b.click(); return true;
})()`);
await until("/background-image/.test(document.querySelector('#js_cover_area')?.innerHTML || '')", "cover crop");

const before = await evaluate("location.href");
const saved = await evaluate(`(() => { const b = Array.from(document.querySelectorAll('button,a,.weui-desktop-btn')).find(x => (x.textContent || '').replace(/\\s+/g,'').includes('保存为草稿') && x.offsetParent); if (!b) return false; b.click(); return true; })()`);
if (!saved) throw new Error("Save button not found");
await wait(6500);
const state = await evaluate(`(() => ({ href: location.href, title: document.querySelector('.title-editor-overlay .ProseMirror')?.textContent || '', hiddenTitle: document.querySelector('#title')?.value || '', digest: document.querySelector('#js_description')?.value || '', body:(document.querySelector('.rich_media_content .ProseMirror')?.textContent || '').trim().length, cover:/background-image/.test(document.querySelector('#js_cover_area')?.innerHTML || '') }))()`);
ws.close();
console.log(JSON.stringify({ item: item.title, before, state }, null, 2));
