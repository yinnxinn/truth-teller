import assert from "node:assert/strict";

const DRAFT_ID = process.env.WECHAT_DRAFT_ID || "100000326";
const pages = await (await fetch("http://127.0.0.1:9222/json")).json();
const page = pages.find(item => (item.url || "").includes("mp.weixin.qq.com"));
assert.ok(page, "logged-in WeChat page is required");
const token = (page.url.match(/token=(\d+)/) || [])[1];
assert.ok(token, "WeChat token is required");

const ws = new WebSocket(page.webSocketDebuggerUrl);
const pending = new Map();
let id = 0;
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
  const requestId = ++id;
  pending.set(requestId, resolve);
  ws.send(JSON.stringify({ id: requestId, method, params }));
});

await command("Page.navigate", {
  url: `https://mp.weixin.qq.com/cgi-bin/appmsg?t=media/appmsg_edit&action=edit&type=77&appmsgid=${DRAFT_ID}&token=${token}&lang=zh_CN`,
});
await new Promise(resolve => setTimeout(resolve, 7000));
const result = await command("Runtime.evaluate", {
  returnByValue: true,
  expression: `(() => Math.max(0, ...Array.from(document.querySelectorAll('[contenteditable="true"]')).map(e => (e.textContent || '').trim().length)))()`,
});
ws.close();
const textLength = result?.result?.result?.value || 0;
assert.ok(textLength > 500, `draft ${DRAFT_ID} persisted body is too short: ${textLength}`);
console.log(`PASS: draft ${DRAFT_ID} persisted body chars=${textLength}`);
