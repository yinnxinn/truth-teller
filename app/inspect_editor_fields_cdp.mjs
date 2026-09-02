const pages = await (await fetch('http://127.0.0.1:9222/json')).json();
const page = pages.find(p => (p.url || '').includes('mp.weixin.qq.com'));
const ws = new WebSocket(page.webSocketDebuggerUrl); let id = 0; const pending = new Map();
ws.addEventListener('message', e => { const m = JSON.parse(e.data); if (pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } });
await new Promise((r,j) => { ws.addEventListener('open',r,{once:true}); ws.addEventListener('error',j,{once:true}); });
const call = (method, params={}) => new Promise(resolve => { const n=++id; pending.set(n,resolve); ws.send(JSON.stringify({id:n,method,params})); });
const expression = `(() => ({
  href: location.href.replace(/token=\\d+/,'token=***'),
  inputs: Array.from(document.querySelectorAll('input,textarea,[contenteditable="true"]')).map((e,i)=>({i,tag:e.tagName,id:e.id,cls:String(e.className||'').slice(0,160),name:e.name||'',placeholder:e.placeholder||'',type:e.type||'',value:e.value||'',text:(e.textContent||'').slice(0,100),visible:!!(e.offsetWidth||e.offsetHeight),outer:e.outerHTML.slice(0,500)})).filter(x=>x.value||x.text||/title|author|description|摘要|标题|作者/i.test(x.id+x.cls+x.name+x.placeholder)),
  labels: Array.from(document.querySelectorAll('label,div,span')).filter(e=>/标题|摘要|作者/.test((e.innerText||'').trim())&&e.children.length<4).map(e=>({text:(e.innerText||'').trim().slice(0,100),outer:e.parentElement?.outerHTML.slice(0,1000)})).slice(0,30)
}))()`;
const result = await call('Runtime.evaluate',{returnByValue:true,expression});
console.log(JSON.stringify(result.result.result.value,null,2)); ws.close();
