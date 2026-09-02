import fs from "node:fs/promises";
import path from "node:path";

const DRAFT_ID = process.env.WECHAT_DRAFT_ID || "100000326";
const ROOT = "D:/wechat/content/drafts/2026-08-18-multi-hotspots";
const meta = JSON.parse(await fs.readFile(`${ROOT}/articles.json`, "utf8"));
const articles = await Promise.all(meta.map(async item => ({
  ...item,
  body: (await fs.readFile(`${ROOT}/${item.key}.html`, "utf8")).replace(/^\s*<section[^>]*>/i, "").replace(/<\/section>\s*$/i, ""),
  cover: `${ROOT}/${item.key}.jpg`,
})));

const pages = await (await fetch("http://127.0.0.1:9222/json")).json();
const page = pages.find(item => (item.url || "").includes("mp.weixin.qq.com"));
if (!page) throw new Error("logged-in WeChat page not found");
const token = (page.url.match(/token=(\d+)/) || [])[1];
if (!token) throw new Error("WeChat token not found");

const ws = new WebSocket(page.webSocketDebuggerUrl);
const pending = new Map(); let sequence = 0; let rootNodeId = 0;
ws.addEventListener("message", event => { const m = JSON.parse(event.data); const f = pending.get(m.id); if (f) { pending.delete(m.id); f(m); } });
await new Promise((resolve, reject) => { ws.addEventListener("open", resolve, { once: true }); ws.addEventListener("error", reject, { once: true }); });
const command = (method, params = {}) => new Promise(resolve => { const id = ++sequence; pending.set(id, resolve); ws.send(JSON.stringify({ id, method, params })); });
const evaluate = async expression => (await command("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true, userGesture: true }))?.result?.result?.value;
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
async function setFile(filePath) {
  rootNodeId = 0;
  const doc = await command("DOM.getDocument", { depth: 0 });
  rootNodeId = doc?.result?.root?.nodeId;
  const node = await command("DOM.querySelector", { nodeId: rootNodeId, selector: ".weui-desktop-dialog input[type=file], input[type=file]" });
  const nodeId = node?.result?.nodeId;
  if (!nodeId) throw new Error("cover file input not found");
  const result = await command("DOM.setFileInputFiles", { nodeId, files: [path.resolve(filePath)] });
  if (result.error) throw new Error(result.error.message || "cover upload failed");
}
async function clickText(text) {
  return await evaluate(`(() => { const e = Array.from(document.querySelectorAll('button,a,.weui-desktop-btn')).find(x => (x.textContent || '').replace(/\\s+/g,'').includes(${JSON.stringify(text)}) && (x.offsetWidth || x.offsetHeight)); if (!e) return false; e.click(); return true; })()`);
}
async function waitFor(test, label) {
  for (let i = 0; i < 24; i++) { if (await evaluate(test)) return; await sleep(500); }
  throw new Error(`timeout: ${label}`);
}

await command("Page.navigate", { url: `https://mp.weixin.qq.com/cgi-bin/appmsg?t=media/appmsg_edit&action=edit&type=77&appmsgid=${DRAFT_ID}&token=${token}&lang=zh_CN` });
await sleep(7000);

for (const article of articles) {
  const before = await evaluate("document.querySelectorAll('.js_appmsg_item').length");
  const added = await evaluate("(() => { const e = document.querySelector('#js_add_appmsg'); if (!e) return false; e.click(); return true; })()");
  if (!added) throw new Error("add article button not found");
  await waitFor(`document.querySelectorAll('.js_appmsg_item').length > ${before}`, "new article card");
  await sleep(900);
  const edited = await evaluate(`(() => {
    const value = ${JSON.stringify(article)};
    const set = (selector, text) => { const e = document.querySelector(selector); if (!e) return false; e.focus(); e.value = text; for (const n of ['input','change','blur']) e.dispatchEvent(new Event(n, { bubbles: true })); return true; };
    const editor = document.querySelector('.rich_media_content .ProseMirror');
    if (!editor) return { ok:false, error:'body editor missing' };
    editor.focus(); document.execCommand('selectAll', false, null);
    const clip = new DataTransfer(); clip.setData('text/html', value.body); clip.setData('text/plain', new DOMParser().parseFromString(value.body, 'text/html').body.innerText);
    editor.dispatchEvent(new ClipboardEvent('paste', { bubbles:true, cancelable:true, clipboardData:clip }));
    return { ok:true, title:set('#title',value.title), author:set('#author',value.author), digest:set('#js_description',value.digest), text:(editor.textContent||'').trim().length };
  })()`);
  if (!edited?.ok || edited.text < 300) throw new Error(`article body insert failed: ${JSON.stringify(edited)}`);
  const opened = await evaluate("(() => { const e = Array.from(document.querySelectorAll('#js_cover_area .js_imagedialog, .js_imagedialog')).find(x => x.offsetWidth || x.offsetHeight); if (!e) return false; e.click(); return true; })()");
  if (!opened) throw new Error("cover picker not found");
  await waitFor("!!document.querySelector('.weui-desktop-dialog input[type=file], input[type=file]')", "cover picker dialog");
  await setFile(article.cover);
  await sleep(1800);
  await clickText("下一步");
  await sleep(900);
  await clickText("确认");
  await waitFor("/mmbiz\\.qpic\\.cn/.test((document.querySelector('#js_cover_area') || document.body).innerHTML)", "cover saved");
  console.log(`prepared: ${article.key}`);
}

const saved = await clickText("保存为草稿");
if (!saved) throw new Error("save button not found");
await sleep(8000);
ws.close();
console.log(JSON.stringify({ ok: true, draftId: DRAFT_ID, appended: articles.length }));
