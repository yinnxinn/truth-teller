#!/usr/bin/env python3
"""Replace generated hotspot text-card images with AI-generated editorial images."""

import base64
import io
import json
from pathlib import Path

from PIL import Image

ROOT = Path("D:/wechat")
OUT_DIR = ROOT / "content" / "drafts" / "2026-08-16-hotspots-5"
IMG_DIR = OUT_DIR / "real-images"
MANIFEST = OUT_DIR / "manifest.json"

GENERATED = {
    32: Path(r"C:\Users\www19\.codex\generated_images\01a005f0-8ebb-7681-9685-387e99e6c0b7\call_6QkJyd6B28XmdGTQSW01lJoH.png"),
    33: Path(r"C:\Users\www19\.codex\generated_images\01a005f0-8ebb-7681-9685-387e99e6c0b7\call_fmuVBPvjDdaS5UrrsoiE0QCL.png"),
    34: Path(r"C:\Users\www19\.codex\generated_images\01a005f0-8ebb-7681-9685-387e99e6c0b7\call_b5cj03K5s1uJuJ0agphx4Q8H.png"),
    35: Path(r"C:\Users\www19\.codex\generated_images\01a005f0-8ebb-7681-9685-387e99e6c0b7\call_21yee7AEqfo5D5cF6UnvIFjG.png"),
    36: Path(r"C:\Users\www19\.codex\generated_images\01a005f0-8ebb-7681-9685-387e99e6c0b7\call_sRER0JYttVXPdDBg6ajfea56.png"),
}

CAPTIONS = {
    32: "AI 进入办公室以后，最先被量化的不是工作，而是人的去留。",
    33: "一张账单摊开，才知道保障和现金流都在喊疼。",
    34: "年轻人买的不是冲动，是一点能立刻兑现的情绪喘息。",
    35: "机器人进厂以后，流程里的水分会比螺丝更先暴露。",
    36: "中年求职最难的不是重新开始，是被迫忘记自己曾经值多少钱。",
}


def compress(src: Path, dst: Path, max_bytes=950_000):
    with Image.open(src) as im:
        im = im.convert("RGB")
        im.thumbnail((1280, 1280), Image.Resampling.LANCZOS)
        q = 88
        while True:
            buf = io.BytesIO()
            im.save(buf, "JPEG", quality=q, optimize=True, progressive=True)
            data = buf.getvalue()
            if len(data) <= max_bytes or q <= 62:
                dst.parent.mkdir(parents=True, exist_ok=True)
                dst.write_bytes(data)
                return {"path": str(dst), "bytes": len(data), "width": im.width, "height": im.height}
            q -= 6


def b64(path: Path):
    return base64.b64encode(path.read_bytes()).decode("ascii")


def img_block(path: Path, caption: str):
    return (
        '<p style="text-align:center;margin:18px 0;">'
        f'<img src="data:image/jpeg;base64,{b64(path)}" style="max-width:90%;border-radius:6px;" /><br/>'
        f'<span style="font-size:12px;color:#999;">{caption}</span></p>'
    )


def replace_between(html: str, marker_caption: str, new_block: str):
    # Replace only the first image paragraph with a matching old caption nearby.
    idx = html.find(marker_caption)
    if idx < 0:
        return html, False
    start = html.rfind("<p", 0, idx)
    end = html.find("</p>", idx)
    if start < 0 or end < 0:
        return html, False
    return html[:start] + new_block + html[end + 4 :], True


def remove_image_paragraph(html: str, marker_caption: str):
    idx = html.find(marker_caption)
    if idx < 0:
        return html, False
    start = html.rfind("<p", 0, idx)
    end = html.find("</p>", idx)
    if start < 0 or end < 0:
        return html, False
    return html[:start] + html[end + 4 :], True


def main():
    manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    out = []
    for item in manifest:
        no = int(item["no"])
        src = GENERATED.get(no)
        if not src or not src.exists():
            raise FileNotFoundError(f"missing generated image for {no}: {src}")
        dst = IMG_DIR / f"{no}-{item['slug']}-real.jpg"
        info = compress(src, dst)
        html_path = Path(item["body_file"])
        html = html_path.read_text(encoding="utf-8")
        old_caption = "当热点变成账单，真相就开始露出来。"
        html, replaced = replace_between(html, old_caption, img_block(dst, CAPTIONS[no]))
        if not replaced and CAPTIONS[no] not in html:
            raise RuntimeError(f"failed to replace first image in {html_path}")
        html, _ = remove_image_paragraph(html, "不是所有新词都代表进步，有些只是旧压力的新包装。")
        html_path.write_text(html, encoding="utf-8")
        item["cover_file"] = str(dst)
        item["real_image_file"] = str(dst)
        item["real_image_bytes"] = info["bytes"]
        out.append({"no": no, "title": item["title"], **info})
    MANIFEST.write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps({"ok": True, "manifest": str(MANIFEST), "images": out}, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
