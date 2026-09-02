const pages = await (await fetch('http://127.0.0.1:9222/json')).json();
const page = pages.find(p => (p.url || '').includes('mp.weixin.qq.com'));
if (!page) throw new Error('WeChat page unavailable');
const ws = new WebSocket(page.webSocketDebuggerUrl); let id = 0; const pending = new Map();
ws.addEventListener('message', e => { const m = JSON.parse(e.data); if (pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } });
await new Promise((resolve, reject) => { ws.addEventListener('open', resolve, { once:true }); ws.addEventListener('error', reject, { once:true }); });
const call = (method, params={}) => new Promise(resolve => { const n = ++id; pending.set(n, resolve); ws.send(JSON.stringify({id:n,method,params})); });
const expression = `(() => ({
  cardCount: document.querySelectorAll('.js_appmsg_item').length,
  add: (() => { const e=document.querySelector('#js_add_appmsg'); return e ? {outer:e.outerHTML.slice(0,1000), visible:!!(e.offsetWidth||e.offsetHeight), text:(e.textContent||'').trim()} : null; })(),
  controls: Array.from(document.querySelectorAll('a,button,[role=button],div')).filter(e => /添加|增加|图文|文章/.test((e.textContent||'').trim()) && (e.offsetWidth||e.offsetHeight)).map(e => ({tag:e.tagName,id:e.id,cls:String(e.className||'').slice(0,180),text:(e.textContent||'').replace(/\\s+/g,' ').trim().slice(0,120),outer:e.outerHTML.slice(0,700)})).slice(0,50),
  dialogs: Array.from(document.querySelectorAll('[role=dialog],.weui-desktop-dialog,.weui-desktop-dialog__wrp')).filter(e=>e.offsetWidth||e.offsetHeight).map(e=>(e.textContent||'').replace(/\\s+/g,' ').trim().slice(0,500))
}))()`;
const result = await call('Runtime.evaluate', {returnByValue:true, expression});
console.log(JSON.stringify(result.result.result.value, null, 2)); ws.close();
