const pages = await (await fetch("http://127.0.0.1:9222/json")).json();
const page = pages.find((item) => (item.url || "").includes("mp.weixin.qq.com"));
if (!page) throw new Error("No logged-in WeChat tab found");

const ws = new WebSocket(page.webSocketDebuggerUrl);
const pending = new Map();
let nextId = 0;
ws.addEventListener("message", (event) => {
  const message = JSON.parse(event.data);
  if (message.id && pending.has(message.id)) {
    pending.get(message.id)(message);
    pending.delete(message.id);
  }
});
await new Promise((resolve, reject) => {
  ws.addEventListener("open", resolve, { once: true });
  ws.addEventListener("error", reject, { once: true });
});
const command = (method, params = {}) => new Promise((resolve, reject) => {
  const id = ++nextId;
  const timer = setTimeout(() => { pending.delete(id); reject(new Error(`timeout: ${method}`)); }, 30000);
  pending.set(id, (result) => { clearTimeout(timer); resolve(result); });
  ws.send(JSON.stringify({ id, method, params }));
});
const evaluate = async (expression) => {
  const result = await command("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true, userGesture: true });
  return result.result?.result?.value;
};

const token = (page.url.match(/[?&]token=(\d+)/) || [])[1];
if (!token) throw new Error("Missing session token");
await command("Page.navigate", { url: `https://mp.weixin.qq.com/cgi-bin/appmsg?begin=0&count=10&type=77&action=list_card&token=${token}&lang=zh_CN` });
await new Promise((resolve) => setTimeout(resolve, 2500));
const menu = await evaluate(`(() => ({ href: location.href.replace(/token=\\d+/,'token=***'), text:(document.body.innerText || '').replace(/\\s+/g,' ').slice(0,4000), actions:Array.from(document.querySelectorAll('a,button,[role="button"],input')).filter(e => /新建|图文|增加|素材|组合|发送|群发|多篇/.test((e.innerText || e.title || e.value || '').trim())).map(e => ({tag:e.tagName,text:(e.innerText || e.title || e.value || '').trim().slice(0,100),href:e.href || '',cls:String(e.className || '').slice(0,120),outer:e.outerHTML.slice(0,700)})).slice(0,150) }))()`);
console.log(JSON.stringify(menu, null, 2));
ws.close();
