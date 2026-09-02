#!/usr/bin/env python3
"""validate_wechat_html.py — 存草稿前的微信版 HTML 体检器。

运行方式（任选其一）：
  python app/validate_wechat_html.py <body.html>            # 校验单个微信版正文文件
  python app/validate_wechat_html.py <dir>                  # 校验目录内所有 *微信版*.html 与嵌套
  python app/validate_wechat_html.py --from-manifest <json> # 先做 {{占位}} 图片内联替换，再校验 manifest 里 body_file

成功返回退出码 0；发现任何问题返回退出码 1 并逐一打印。

检查项（针对微信编辑器兼容性）：
  1. 未替换的 {{MARKER}} 占位（说明用了 {{BODY_IMAGE_N}} 但没被替换成图片）
  2. 微信会清空的 CSS：linear-gradient / flex / float / position / box-shadow /
     text-shadow / transform / object-fit
  3. <style> / class / 内嵌 <script>（成品里不应残留）
  4. 正文极短信号（<150 字原文通常是注入失败或空壳）
  5. <img> 若 src 既不是 data: 也不是 http(s)——多半坏了
"""
import argparse
import json
import re
import sys
from pathlib import Path

FILTERED_CSS = [
    "linear-gradient", "display:flex", "display: flex", "float:", "position:",
    "box-shadow", "text-shadow", "transform", "object-fit", "flex:",
]
BAD_GENERIC = ["<style", "<script", "<link rel"]
IMG_SRC_RE = re.compile(r'<img\b[^>]*?\bsrc\s*=\s*"([^"]*)"', re.I)
PLACEHOLDER_RE = re.compile(r"\{\{[A-Za-z0-9_\-]+\}\}")


def inline_manifest_images(body: str, manifest_item: dict) -> str:
    """把 manifest.inline_images 中的文件替换成 data: URI，复现 create*_cdp.mjs 的做法。"""
    for marker, image_path in (manifest_item.get("inline_images") or {}).items():
        p = Path(image_path)
        if not p.exists():
            print(f"  [missing-image] {marker} -> {image_path} 不存在")
            continue
        ext = "png" if p.suffix.lower() == ".png" else "jpeg"
        b64 = p.read_bytes()
        from base64 import b64encode
        body = body.replace("{{" + marker + "}}", f"data:image/{ext};base64,{b64encode(b64).decode()}")
    return body


def validate(body: str, label: str) -> list[str]:
    problems = []
    markup = re.sub(r"<[^>]+>", "", body)
    text = re.sub(r"\s+", "", markup)

    # 1) 占位符残留
    for m in PLACEHOLDER_RE.findall(body):
        problems.append(f"{label}: 未替换占位符 {m}")

    # 2) 微信会清空的 CSS
    lower = body.lower()
    for css in FILTERED_CSS:
        if css in lower:
            problems.append(f"{label}: 检测到可能被微信清空的样式 「{css}」")

    # 3) 成品不应残留的标签/class
    for tag in BAD_GENERIC:
        if tag in lower:
            problems.append(f"{label}: 残留 {tag}")

    # 4) 空/极短
    if not text:
        problems.append(f"{label}: 正文为空")
    elif len(text) < 150:
        problems.append(f"{label}: 纯文本过短({len(text)}字)，疑似注入失败")

    # 5) img src 合法性（排除 data: 与 http）
    for src in IMG_SRC_RE.findall(body):
        s = src.strip()
        if s and not s.startswith("data:") and not s.lower().startswith("http"):
            problems.append(f"{label}: 非内联/非 http 图片 src 起始 `{s[:40]}`")

    return problems


def collect_html_files(path: Path) -> list[Path]:
    if path.is_file():
        return [path]
    return sorted(path.rglob("*.html"))


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("path", nargs="?", help="单个 html / 目录", default=None)
    ap.add_argument("--from-manifest", help="沿 manifest.json 校验，并把 {{占位}} 替换为真实图片", default=None)
    args = ap.parse_args()

    targets: list[Path] = []
    if args.from_manifest:
        mf = json.loads(Path(args.from_manifest).read_text(encoding="utf-8"))
        items = mf if isinstance(mf, list) else [mf]
        for it in items:
            bf = it.get("body_file") or it.get("file")
            if bf:
                targets.append(Path(bf))
    elif args.path:
        targets = collect_html_files(Path(args.path))
    else:
        ap.error("need path 或 --from-manifest")

    all_problems: list[str] = []
    for t in targets:
        body = t.read_text(encoding="utf-8", errors="replace")
        if args.from_manifest:
            mf = json.loads(Path(args.from_manifest).read_text(encoding="utf-8"))
            items = mf if isinstance(mf, list) else [mf]
            for it in items:
                if Path(it.get("body_file") or it.get("file")) == t:
                    body = inline_manifest_images(body, it)
                    break
        rel = t.relative_to(Path.cwd()) if t.is_relative_to(Path.cwd()) else t
        all_problems += validate(body, str(rel).replace("\\", "/"))

    if all_problems:
        print(f"FAIL  {len(targets)} 文件, {len(all_problems)} 处问题:")
        for p in all_problems:
            print("  -", p)
        return 1
    print(f"OK  {len(targets)} 文件全部通过体检")
    return 0


if __name__ == "__main__":
    sys.exit(main())
