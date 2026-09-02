"""把当前生成的文章通过 Chrome CDP 注入到公众号草稿编辑器。"""

import json
import re
import time
from pathlib import Path

import requests
import websocket


CDP_HTTP = "http://127.0.0.1:9222"
APPMSGID = "100000096"
ARTICLE_HTML = (
    Path("D:/wechat/content/drafts/2026-08-15-ai评分裁员")
    / "真相官-AI不会先裁掉你它会先把你打成一个分数-公众号-微信版.html"
)
LOG_PATH = Path("D:/wechat/logs/cdp_inject_current_article.json")


class Tab:
    def __init__(self, ws_url: str):
        self.ws = websocket.create_connection(ws_url, timeout=60)
        self._id = 0

    def cmd(self, method, params=None, timeout=60):
        self._id += 1
        msg_id = self._id
        self.ws.send(json.dumps({"id": msg_id, "method": method, "params": params or {}}))
        deadline = time.time() + timeout
        while time.time() < deadline:
            message = json.loads(self.ws.recv())
            if message.get("id") == msg_id:
                return message
        return {"error": {"message": f"timeout calling {method}"}}

    def eval(self, js, timeout=60):
        response = self.cmd(
            "Runtime.evaluate",
            {
                "expression": js,
                "returnByValue": True,
                "awaitPromise": True,
                "userGesture": True,
            },
            timeout=timeout,
        )
        result = response.get("result", {}).get("result", {})
        if "value" in result:
            return result["value"]
        if "description" in result:
            return {"description": result["description"]}
        return response

    def close(self):
        self.ws.close()


def cdp_pages():
    return requests.get(f"{CDP_HTTP}/json", timeout=8).json()


def find_token_and_page():
    pages = cdp_pages()
    for page in pages:
        url = page.get("url", "")
        match = re.search(r"token=(\d+)", url)
        if match and "mp.weixin.qq.com" in url:
            return match.group(1), page
    raise RuntimeError("未在 9222 的 Chrome 页面中找到公众号 token")


def extract_body_html():
    full_html = ARTICLE_HTML.read_text(encoding="utf-8")
    match = re.search(r"<section[^>]*>([\s\S]*)</section>", full_html)
    body = match.group(1) if match else full_html
    return body


def wait_for_editor(tab: Tab, timeout=90):
    probe_js = """
(() => {
  const editables = Array.from(document.querySelectorAll('[contenteditable="true"]'));
  const body = document.body ? document.body.textContent.replace(/\\s+/g, ' ').slice(0, 200) : '';
  return {
    href: location.href,
    titleInput: !!document.querySelector('#title'),
    editableCount: editables.length,
    longestEditableText: editables.reduce((m, el) => Math.max(m, (el.textContent || '').length), 0),
    body
  };
})()
"""
    deadline = time.time() + timeout
    last = None
    while time.time() < deadline:
        last = tab.eval(probe_js, timeout=20)
        if isinstance(last, dict) and last.get("titleInput") and last.get("editableCount", 0) > 0:
            return last
        time.sleep(2)
    raise RuntimeError(f"编辑器未加载：{last}")


def inject_article(tab: Tab, body_html: str):
    inject_js = f"""
((htmlContent) => {{
  function fire(el, name) {{
    let event;
    try {{
      event = new InputEvent(name, {{ bubbles: true, cancelable: true, inputType: 'insertHTML', data: '' }});
    }} catch (_) {{
      event = document.createEvent('HTMLEvents');
      event.initEvent(name, true, false);
    }}
    el.dispatchEvent(event);
  }}

  const candidates = [];
  const add = (el, source) => {{
    if (!el) return;
    candidates.push({{
      el,
      source,
      textLen: (el.textContent || '').trim().length,
      htmlLen: (el.innerHTML || '').length,
      className: String(el.className || '').slice(0, 120)
    }});
  }};

  add(document.querySelector('.rich_media_content .ProseMirror'), '.rich_media_content .ProseMirror');
  add(document.querySelector('#js_editor .ProseMirror'), '#js_editor .ProseMirror');
  add(document.querySelector('#js_editor [contenteditable="true"]'), '#js_editor [contenteditable]');
  add(document.querySelector('.ProseMirror'), '.ProseMirror');
  add(document.querySelector('#ueditor_0'), '#ueditor_0');
  add(document.querySelector('.edui-body-container'), '.edui-body-container');
  document.querySelectorAll('[contenteditable="true"]').forEach((el, idx) => add(el, `contenteditable:${{idx}}`));

  const unique = [];
  const seen = new Set();
  for (const item of candidates) {{
    if (seen.has(item.el)) continue;
    seen.add(item.el);
    unique.push(item);
  }}

  const bodyCandidates = unique.filter(item => item.textLen > 100 || item.htmlLen > 1000);
  const chosen = (bodyCandidates.length ? bodyCandidates : unique)
    .sort((a, b) => b.textLen - a.textLen)[0];
  if (!chosen) return {{ success: false, error: 'editor not found', candidates: [] }};

  const editor = chosen.el;
  editor.focus();
  editor.innerHTML = htmlContent;
  ['beforeinput', 'input', 'change', 'keyup', 'mouseup', 'paste', 'compositionend', 'blur']
    .forEach(name => fire(editor, name));

  return {{
    success: true,
    chosen: {{
      source: chosen.source,
      textLenBefore: chosen.textLen,
      htmlLenBefore: chosen.htmlLen,
      className: chosen.className
    }},
    candidates: unique.map(item => ({{
      source: item.source,
      textLen: item.textLen,
      htmlLen: item.htmlLen,
      className: item.className
    }})).slice(0, 12),
    afterTextLen: (editor.textContent || '').length,
    afterHtmlLen: (editor.innerHTML || '').length,
    hasOldDate: (editor.textContent || '').includes('2026-08-15'),
    hasNewJudge: (editor.textContent || '').includes('这篇原文真正值得追问的'),
    hasTruthLabel: (editor.textContent || '').includes('真相一句话'),
    imgCount: editor.querySelectorAll('img').length,
    dataImgCount: Array.from(editor.querySelectorAll('img')).filter(img => (img.getAttribute('src') || '').startsWith('data:')).length
  }};
}})({json.dumps(body_html, ensure_ascii=False)})
"""
    return tab.eval(inject_js, timeout=60)


def save_draft(tab: Tab):
    save_js = """
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
"""
    return tab.eval(save_js, timeout=30)


def post_save_status(tab: Tab):
    status_js = """
(() => {
  const text = document.body ? document.body.textContent.replace(/\\s+/g, ' ').slice(0, 1000) : '';
  const dialogs = Array.from(document.querySelectorAll('.weui-desktop-dialog, .weui-desktop-modal, .dialog_wrp'))
    .map(d => d.textContent.replace(/\\s+/g, ' ').slice(0, 120));
  const toasts = Array.from(document.querySelectorAll('.weui-desktop-toast, .tips_global, .tool_bar_tips'))
    .map(t => t.textContent.replace(/\\s+/g, ' ').slice(0, 120));
  return { href: location.href, dialogs, toasts, bodyHead: text };
})()
"""
    return tab.eval(status_js, timeout=20)


def main():
    LOG_PATH.parent.mkdir(parents=True, exist_ok=True)
    log = {
        "ok": False,
        "step": "start",
        "article": str(ARTICLE_HTML),
        "appmsgid": APPMSGID,
        "events": [],
    }
    try:
        token, page = find_token_and_page()
        body_html = extract_body_html()
        log["bodyChars"] = len(body_html)
        log["bodyHasDate"] = "2026-08-15" in body_html
        tab = Tab(page["webSocketDebuggerUrl"])
        try:
            edit_url = (
                "https://mp.weixin.qq.com/cgi-bin/appmsg"
                f"?t=media/appmsg_edit&action=edit&reprint_confirm=0"
                f"&type=77&appmsgid={APPMSGID}&token={token}&lang=zh_CN"
            )
            tab.cmd("Page.enable")
            tab.cmd("Runtime.enable")
            tab.cmd("Page.navigate", {"url": edit_url}, timeout=30)
            log["events"].append("navigate_editor")
            log["loadProbe"] = wait_for_editor(tab)
            log["events"].append("editor_ready")
            log["inject"] = inject_article(tab, body_html)
            log["events"].append("inject_done")
            time.sleep(2)
            log["saveClick"] = save_draft(tab)
            log["events"].append("save_clicked")
            time.sleep(5)
            log["postSave"] = post_save_status(tab)
            log["ok"] = True
            log["step"] = "done"
        finally:
            tab.close()
    except Exception as exc:
        log["step"] = "error"
        log["error"] = str(exc)
    LOG_PATH.write_text(json.dumps(log, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(
        {
            "ok": log.get("ok"),
            "step": log.get("step"),
            "events": log.get("events"),
            "bodyChars": log.get("bodyChars"),
            "inject": log.get("inject"),
            "saveClick": log.get("saveClick"),
            "log": str(LOG_PATH),
        },
        ensure_ascii=False,
        indent=2,
    ))


if __name__ == "__main__":
    main()
