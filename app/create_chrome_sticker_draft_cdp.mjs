import path from 'node:path';
import { stickerImageChannel } from './sticker_image_channel.mjs';

const ROOT = 'D:/wechat';
const IMAGE_DIR = path.join(ROOT, 'content/drafts/2026-08-29-sticker-chrome-workbench/images');
const images = [
  '01-workbench-cover.jpg',
  '02-before-after.jpg',
  '03-three-layers.jpg',
  '04-search-bookmarks.jpg',
].map(name => path.join(IMAGE_DIR, name));

const pages = await (await fetch('http://127.0.0.1:9222/json')).json();
const page = pages
  .filter(p => /mp\.weixin\.qq\.com/.test(p.url || '') && /createType=8/.test(p.url || ''))
  .sort((a, b) => Number(b.url.match(/timestamp=(\d+)/)?.[1] || 0) - Number(a.url.match(/timestamp=(\d+)/)?.[1] || 0))[0];
if (!page) throw new Error('No open WeChat sticker editor found');

class Tab {
  constructor(url) { this.url = url; this.id = 0; this.pending = new Map(); }
  async connect() {
    this.ws = new WebSocket(this.url);
    this.ws.addEventListener('message', event => {
      const message = JSON.parse(event.data);
      const pending = this.pending.get(message.id);
      if (pending) { clearTimeout(pending.timer); this.pending.delete(message.id); pending.resolve(message); }
    });
    await new Promise((resolve, reject) => {
      this.ws.addEventListener('open', resolve, { once: true });
      this.ws.addEventListener('error', reject, { once: true });
    });
  }
  cmd(method, params = {}, timeout = 60000) {
    const id = ++this.id;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => { this.pending.delete(id); reject(new Error(method + ' timeout')); }, timeout);
      this.pending.set(id, { resolve, timer });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }
  async eval(expression) {
    return (await this.cmd('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true, userGesture: true })).result?.result?.value;
  }
}
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const tab = new Tab(page.webSocketDebuggerUrl);
await tab.connect();
try {
  await sleep(1500);
  const filled = await tab.eval(`(() => {
    const set = (el, value) => {
      el.focus();
      el.innerHTML = '';
      el.textContent = value;
      el.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: value }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
      el.dispatchEvent(new Event('blur', { bubbles: true }));
    };
    const editors = Array.from(document.querySelectorAll('div.ProseMirror')).filter(el => el.offsetParent);
    const title = editors.find(el => el.dataset.placeholder === '请在这里输入标题');
    const description = editors.find(el => (el.innerText || '').includes('填写描述信息'));
    if (!title || !description) return { ok: false, editors: editors.map(el => ({ placeholder: el.dataset.placeholder || '', text: (el.innerText || '').slice(0,80), style: el.getAttribute('style') || '' })) };
    set(title, 'Chrome 书签栏，3 步变成工作台');
    set(description, '别再把书签当网址垃圾场：按“正在用—固定用—资料库”分层，配合 @bookmarks，常用链接几秒找回。');
    return { ok: true };
  })()`);
  if (!filled?.ok) throw new Error('Unable to find sticker title, description and body editors: ' + JSON.stringify(filled));

  const doc = await tab.cmd('DOM.getDocument', { depth: 1 });
  const input = await tab.cmd('DOM.querySelector', { nodeId: doc.result.root.nodeId, selector: stickerImageChannel.uploadSelector });
  if (!input.result.nodeId) throw new Error('Sticker image upload input not found');
  const existingStickerImages = await tab.eval(`document.querySelectorAll('${stickerImageChannel.verifySelector}').length`);
  if (existingStickerImages > 1) throw new Error('Blank sticker editor already contains unexpected assets: ' + existingStickerImages);
  const filesToUpload = existingStickerImages === 1 ? images.slice(1) : images;
  await tab.cmd('DOM.setFileInputFiles', { nodeId: input.result.nodeId, files: filesToUpload }, 120000);
  await sleep(8000);

  const check = await tab.eval(`(() => ({
    title: document.querySelector('div.ProseMirror[data-placeholder="请在这里输入标题"]')?.innerText || '',
    text: (document.body.innerText || '').replace(/\\s+/g, ' ').slice(0, 1600),
    stickerImageCount: document.querySelectorAll('.image-selector img[src*="mmbiz.qpic.cn"]').length,
    bodyImageCount: document.querySelectorAll('div.ProseMirror[style*="min-height"] img[data-upload="1"]').length
  }))()`);
  if (check.stickerImageCount !== 4 || check.bodyImageCount !== 0) {
    throw new Error('Sticker channel verification failed: ' + JSON.stringify(check));
  }
  console.log(JSON.stringify({ filled, existingStickerImages, uploaded: filesToUpload.length, check }, null, 2));
} finally {
  tab.ws.close();
}
