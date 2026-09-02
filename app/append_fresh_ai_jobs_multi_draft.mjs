import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const CDP_HTTP = 'http://127.0.0.1:9222';
const MANIFEST = process.env.WECHAT_HOTSPOT_MANIFEST || 'D:/wechat/content/drafts/2026-08-27-fresh-ai-jobs-ab/manifest.json';
const ARTICLE_INDEX = Number(process.env.WECHAT_HOTSPOT_INDEX || 1);
const DRAFT_ID = process.env.WECHAT_DRAFT_ID || '100001116';

export async function loadArticleFromManifest(manifestPath, articleIndex) {
  const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
  const item = manifest[articleIndex];
  if (!item) throw new Error(`missing manifest article ${articleIndex}`);
  let body = (await fs.readFile(item.body_file, 'utf8')).replace(/^\s*<section[^>]*>/i, '').replace(/<\/section>\s*$/i, '');
  for (const [marker, imagePath] of Object.entries(item.inline_images || {})) {
    const data = await fs.readFile(imagePath);
    body = body.replaceAll(`{{${marker}}}`, `data:image/jpeg;base64,${data.toString('base64')}`);
  }
  if (/{{[^}]+}}/.test(body)) throw new Error(`unresolved image marker in ${item.title}`);
  const bodyTextLength = body.replace(/<[^>]+>/g, '').replace(/&[a-z]+;/g, ' ').trim().length;
  if (bodyTextLength < 1000) throw new Error(`short article payload: ${bodyTextLength}`);
  return { title: item.title, author: item.author || '', digest: item.digest || '', body, bodyTextLength, coverFile: item.cover_file };
}

export function isDirectEntry(importMetaUrl, argvPath) {
  return Boolean(argvPath) && path.resolve(argvPath) === fileURLToPath(importMetaUrl);
}

class Tab {
  constructor(wsUrl) { this.wsUrl = wsUrl; this.id = 0; this.pending = new Map(); }
  async connect() {
    this.ws = new WebSocket(this.wsUrl);
    this.ws.addEventListener('message', event => { const msg = JSON.parse(event.data); const done = this.pending.get(msg.id); if (done) { clearTimeout(done.timer); this.pending.delete(msg.id); done.resolve(msg); } });
    await new Promise((resolve, reject) => { this.ws.addEventListener('open', resolve, { once: true }); this.ws.addEventListener('error', reject, { once: true }); });
  }
  cmd(method, params = {}, timeoutMs = 45000) {
    const id = ++this.id;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => { this.pending.delete(id); reject(new Error(`timeout: ${method}`)); }, timeoutMs);
      this.pending.set(id, { resolve, timer }); this.ws.send(JSON.stringify({ id, method, params }));
    });
  }
  async eval(expression) { return (await this.cmd('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true, userGesture: true }))?.result?.result?.value; }
  close() { this.ws?.close(); }
}

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
async function waitFor(tab, expression, label) {
  for (let i = 0; i < 60; i++) { if (await tab.eval(expression)) return; await sleep(500); }
  throw new Error(`timeout waiting for ${label}`);
}

async function main() {
  const article = await loadArticleFromManifest(MANIFEST, ARTICLE_INDEX);
  const pages = await (await fetch(`${CDP_HTTP}/json`)).json();
  const page = pages.find(item => (item.url || '').includes('mp.weixin.qq.com'));
  const token = page?.url?.match(/token=(\d+)/)?.[1];
  if (!page || !token) throw new Error('logged-in WeChat page not found');
  const tab = new Tab(page.webSocketDebuggerUrl); await tab.connect();
  try {
    await tab.cmd('Page.navigate', { url: `https://mp.weixin.qq.com/cgi-bin/appmsg?t=media/appmsg_edit&action=edit&reprint_confirm=0&type=77&appmsgid=${DRAFT_ID}&token=${token}&lang=zh_CN` });
    await waitFor(tab, "!!document.querySelector('#js_add_appmsg') && !!document.querySelector('.rich_media_content .ProseMirror')", 'multi-article editor');
    const before = await tab.eval("document.querySelectorAll('.js_appmsg_item').length");
    if (before !== 1) throw new Error(`refusing to append: expected one article, found ${before}`);
    const add = await tab.eval("(() => { const el=document.querySelector('#js_add_appmsg'); if(!el) return false; el.click(); return true; })()");
    if (!add) throw new Error('add article control unavailable');
    await waitFor(tab, `document.querySelectorAll('.js_appmsg_item').length === ${before + 1}`, 'second article card');
    await sleep(800);
    const filled = await tab.eval(`(() => {
      const article = ${JSON.stringify(article)};
      const set = (selector, value) => {
        const el = document.querySelector(selector); if (!el) return false;
        const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
        Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, value);
        el.dispatchEvent(new InputEvent('input', {bubbles:true, inputType:'insertText', data:value}));
        el.dispatchEvent(new Event('change', {bubbles:true})); return true;
      };
      const editor = document.querySelector('.rich_media_content .ProseMirror'); if (!editor) return {ok:false};
      editor.focus(); editor.innerHTML = ''; editor.dispatchEvent(new InputEvent('input', {bubbles:true, inputType:'deleteContentBackward'}));
      const clip = new DataTransfer(); clip.setData('text/html', article.body); clip.setData('text/plain', new DOMParser().parseFromString(article.body, 'text/html').body.innerText);
      editor.dispatchEvent(new ClipboardEvent('paste', {bubbles:true,cancelable:true,clipboardData:clip}));
      return {ok:set('#title',article.title) && set('#author',article.author) && set('#js_description',article.digest), title:document.querySelector('#title')?.value || '', body:(editor.textContent || '').trim().length};
    })()`);
    if (!filled?.ok || filled.title !== article.title || filled.body < 1000) throw new Error(`second article insertion failed: ${JSON.stringify(filled)}`);
    const openCover = await tab.eval("(() => { const el=document.querySelector('#js_cover_area .js_imagedialog') || document.querySelector('.js_imagedialog'); if(!el) return false; el.click(); return true; })()");
    if (!openCover) throw new Error('cover picker unavailable');
    await waitFor(tab, "!!document.querySelector('.weui-desktop-dialog input[type=file], input[type=file]')", 'cover picker');
    const doc = await tab.cmd('DOM.getDocument', { depth: 0 });
    const input = await tab.cmd('DOM.querySelector', { nodeId: doc.result.root.nodeId, selector: '.weui-desktop-dialog input[type=file], input[type=file]' });
    if (!input.result.nodeId) throw new Error('cover file input unavailable');
    await tab.cmd('DOM.setFileInputFiles', { nodeId: input.result.nodeId, files: [path.resolve(article.coverFile)] });
    await sleep(2000);
    await tab.eval("(() => { const el=Array.from(document.querySelectorAll('button,a')).find(x => (x.textContent||'').trim()==='下一步' && x.offsetParent); if(!el) return false; el.click(); return true; })()");
    await sleep(700);
    await tab.eval("(() => { const el=Array.from(document.querySelectorAll('button,a')).find(x => ['确认','完成','确定'].includes((x.textContent||'').trim()) && x.offsetParent); if(!el) return false; el.click(); return true; })()");
    await waitFor(tab, "/background-image/.test(document.querySelector('#js_cover_area')?.innerHTML || '')", 'second cover');
    const save = await tab.eval("(() => { const el=Array.from(document.querySelectorAll('button,a,.weui-desktop-btn')).find(x => (x.textContent||'').replace(/\\s+/g,'').includes('保存为草稿') && x.offsetParent); if(!el) return false; el.click(); return true; })()");
    if (!save) throw new Error('save draft control unavailable');
    await sleep(6500);
    const result = await tab.eval(`(() => ({cards:document.querySelectorAll('.js_appmsg_item').length, title:document.querySelector('#title')?.value || '', body:(document.querySelector('.rich_media_content .ProseMirror')?.textContent || '').trim().length, cover:/background-image/.test(document.querySelector('#js_cover_area')?.innerHTML || '')}))()`);
    if (result.cards !== 2 || result.title !== article.title || result.body < 1000 || !result.cover) throw new Error(`saved multi-draft verification failed: ${JSON.stringify(result)}`);
    console.log(JSON.stringify({ ok: true, draftId: DRAFT_ID, appended: article.title, state: result }, null, 2));
  } finally { tab.close(); }
}

if (isDirectEntry(import.meta.url, process.argv[1])) await main();
