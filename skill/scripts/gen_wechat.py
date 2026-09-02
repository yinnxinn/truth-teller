#!/usr/bin/env python3
"""
通用微信版 HTML 生成器 — 毒舌职场真相官 skill

用法:
  python gen_wechat.py --config article.json --out 真相官-xxx-公众号-微信版.html

或者作为模块导入，调用 build_wechat_html(article_data) 拿到 HTML 字符串。

article.json 格式:
{
  "title": "文章标题",
  "date": "2026-08-13",
  "author": "毒舌职场真相官",
  "lead": "引言段落...",
  "verdict": "[真相翻译官] 一句话本质...",
  "sections": [
    {"heading": "① 标题：震惊体三件套", "quote": "原文摘录...", "comment": "点评..."},
    ...
  ],
  "judge_title": "[最后的判词]",
  "judge_body": "判词正文...",
  "medical_title": "医学提醒（认真脸）",        # 可选
  "medical_items": ["条目1", "条目2", ...],      # 可选
  "medical_note": "以上医学要点...",             # 可选
  "source_url": "https://mp.weixin.qq.com/s/xxx",
  "source_label": "原文来源标题",
  "footer": "版权声明文字",
  "cover_b64": "base64编码的封面图",             # 可选，不用 data: 前缀
  "images": [                                     # 可选，文中配图
    {"b64": "base64...", "caption": "图1 · 说明"},
    {"b64": "base64...", "caption": "图2 · 说明"}
  ],
  "template": "classic"                           # classic | dark | magazine
}
"""

import json, sys, os, argparse, io, re

# ============================================================
# 样式字典 — 三套模板
# ============================================================

STYLES = {
    "classic": {
        "h1":        "font-size:22px;font-weight:700;color:#2b3a55;line-height:1.4;margin:0 0 6px;",
        "meta":      "font-size:13px;color:#888;line-height:1.6;margin:0 0 14px;",
        "author_b":  "color:#576b95;",
        "p":         "font-size:17px;line-height:1.8;color:#3f3f3f;margin:0 0 18px;",
        "lead":      "font-size:17px;line-height:1.8;color:#555;margin:0 0 18px;",
        "tag":       "display:inline-block;background:#f2f4f8;color:#4a6fa5;font-size:13px;font-weight:700;padding:2px 8px;border-radius:4px;margin:6px 0 10px;",
        "h3":        "font-size:18px;font-weight:700;color:#2b3a55;line-height:1.5;margin:22px 0 10px;",
        "quote":     "border-left:4px solid #4a6fa5;background:#f7f9fc;padding:10px 14px;margin:0 0 10px;font-size:15px;color:#555;border-radius:0 6px 6px 0;line-height:1.7;",
        "judge":     "background:#2b3a55;color:#fff;padding:16px 18px;border-radius:8px;margin:10px 0 20px;font-size:16px;line-height:1.75;",
        "judge_b":   "color:#ffd479;font-weight:700;",
        "bodyimg":   "width:100%;border-radius:8px;display:block;margin:4px 0 6px;",
        "cap":       "font-size:12px;color:#999;text-align:center;margin:0 0 18px;",
        "med":       "background:#fff7e6;border:1px solid #ffe0a3;border-radius:8px;padding:14px 16px;margin:10px 0 20px;font-size:15px;line-height:1.8;color:#8a5a00;",
        "medh":      "color:#c47f00;font-size:15px;font-weight:700;margin:0 0 8px;",
        "medli":     "margin:0 0 6px 18px;",
        "mednote":   "color:#888;font-size:14px;line-height:1.8;margin:0 0 18px;",
        "foot":      "font-size:12px;color:#aaa;line-height:1.7;border-top:1px solid #eee;padding-top:14px;margin-top:10px;",
        "src":       "font-size:13px;color:#555;line-height:1.7;border-top:1px solid #eee;margin-top:6px;padding-top:14px;",
        "srct":      "color:#888;font-size:12px;margin:0 0 8px;",
        "srcl":      "display:inline-block;color:#576b95;text-decoration:none;word-break:break-all;background:#f2f4f8;padding:8px 12px;border-radius:6px;font-size:13px;line-height:1.6;",
        "srcn":      "margin-top:8px;color:#999;font-size:12px;",
        "section":   "font-family:-apple-system,'PingFang SC','Microsoft YaHei',sans-serif;",
    },
    "dark": {
        "h1":        "font-size:22px;font-weight:700;color:#e8e8e8;line-height:1.4;margin:0 0 6px;",
        "meta":      "font-size:13px;color:#999;line-height:1.6;margin:0 0 14px;",
        "author_b":  "color:#ff6b6b;",
        "p":         "font-size:17px;line-height:1.8;color:#ccc;margin:0 0 18px;",
        "lead":      "font-size:17px;line-height:1.8;color:#aaa;margin:0 0 18px;",
        "tag":       "display:inline-block;background:#1a1a2e;color:#e94560;font-size:13px;font-weight:700;padding:2px 8px;border-radius:4px;margin:6px 0 10px;",
        "h3":        "font-size:18px;font-weight:700;color:#e8e8e8;line-height:1.5;margin:22px 0 10px;",
        "quote":     "border-left:4px solid #e94560;background:#16213e;padding:10px 14px;margin:0 0 10px;font-size:15px;color:#999;border-radius:0 6px 6px 0;line-height:1.7;",
        "judge":     "background:#0f0f0f;color:#ffd700;padding:16px 18px;border-radius:8px;margin:10px 0 20px;font-size:16px;line-height:1.75;border:1px solid #333;",
        "judge_b":   "color:#ffd700;font-weight:700;",
        "bodyimg":   "width:100%;border-radius:8px;display:block;margin:4px 0 6px;",
        "cap":       "font-size:12px;color:#666;text-align:center;margin:0 0 18px;",
        "med":       "background:#1a1a2e;border:1px solid #e94560;border-radius:8px;padding:14px 16px;margin:10px 0 20px;font-size:15px;line-height:1.8;color:#ccc;",
        "medh":      "color:#e94560;font-size:15px;font-weight:700;margin:0 0 8px;",
        "medli":     "margin:0 0 6px 18px;",
        "mednote":   "color:#666;font-size:14px;line-height:1.8;margin:0 0 18px;",
        "foot":      "font-size:12px;color:#555;line-height:1.7;border-top:1px solid #222;padding-top:14px;margin-top:10px;",
        "src":       "font-size:13px;color:#777;line-height:1.7;border-top:1px solid #222;margin-top:6px;padding-top:14px;",
        "srct":      "color:#555;font-size:12px;margin:0 0 8px;",
        "srcl":      "display:inline-block;color:#e94560;text-decoration:none;word-break:break-all;background:#16213e;padding:8px 12px;border-radius:6px;font-size:13px;line-height:1.6;",
        "srcn":      "margin-top:8px;color:#555;font-size:12px;",
        "section":   "font-family:-apple-system,'PingFang SC','Microsoft YaHei',sans-serif;background:#0a0a0a;padding:20px;border-radius:8px;",
    },
    "magazine": {
        "h1":        "font-size:22px;font-weight:700;color:#2d3436;line-height:1.4;margin:0 0 6px;",
        "meta":      "font-size:13px;color:#b2bec3;line-height:1.6;margin:0 0 14px;",
        "author_b":  "color:#e17055;",
        "p":         "font-size:17px;line-height:1.8;color:#2d3436;margin:0 0 18px;",
        "lead":      "font-size:17px;line-height:1.8;color:#636e72;margin:0 0 18px;",
        "tag":       "display:inline-block;background:#ffeaa7;color:#d63031;font-size:13px;font-weight:700;padding:2px 8px;border-radius:12px;margin:6px 0 10px;",
        "h3":        "font-size:18px;font-weight:700;color:#2d3436;line-height:1.5;margin:22px 0 10px;",
        "quote":     "border-left:4px solid #74b9ff;background:#f5f6fa;padding:10px 14px;margin:0 0 10px;font-size:15px;color:#636e72;border-radius:0 6px 6px 0;line-height:1.7;",
        "judge":     "background:#fdcb6e;color:#2d3436;padding:16px 18px;border-radius:12px;margin:10px 0 20px;font-size:16px;line-height:1.75;",
        "judge_b":   "color:#d63031;font-weight:700;",
        "bodyimg":   "width:100%;border-radius:12px;display:block;margin:4px 0 6px;",
        "cap":       "font-size:12px;color:#b2bec3;text-align:center;margin:0 0 18px;",
        "med":       "background:#e3f6f5;border:1px solid #55efc4;border-radius:12px;padding:14px 16px;margin:10px 0 20px;font-size:15px;line-height:1.8;color:#2d3436;",
        "medh":      "color:#00b894;font-size:15px;font-weight:700;margin:0 0 8px;",
        "medli":     "margin:0 0 6px 18px;",
        "mednote":   "color:#636e72;font-size:14px;line-height:1.8;margin:0 0 18px;",
        "foot":      "font-size:12px;color:#b2bec3;line-height:1.7;border-top:1px solid #dfe6e9;padding-top:14px;margin-top:10px;",
        "src":       "font-size:13px;color:#636e72;line-height:1.7;border-top:1px solid #dfe6e9;margin-top:6px;padding-top:14px;",
        "srct":      "color:#b2bec3;font-size:12px;margin:0 0 8px;",
        "srcl":      "display:inline-block;color:#e17055;text-decoration:none;word-break:break-all;background:#f5f6fa;padding:8px 12px;border-radius:12px;font-size:13px;line-height:1.6;",
        "srcn":      "margin-top:8px;color:#b2bec3;font-size:12px;",
        "section":   "font-family:-apple-system,'PingFang SC','Microsoft YaHei',sans-serif;",
    },
}

# ============================================================
# HTML 构建函数
# ============================================================

def build_sections_html(sections, s):
    """构建毒舌深拆解的逐段点评 HTML"""
    parts = []
    for sec in sections:
        parts.append(f'<h3 style="{s["h3"]}">{sec["heading"]}</h3>')
        if sec.get("quote"):
            parts.append(f'<p style="{s["quote"]}">原文摘录："{sec["quote"]}"</p>')
        if sec.get("comment"):
            parts.append(f'<p style="{s["p"]}">{sec["comment"]}</p>')
    return "\n  ".join(parts)


def build_images_html(images, s):
    """构建文中配图 HTML（base64 内联）"""
    if not images:
        return ""
    parts = []
    for img in images:
        b64 = img.get("b64", "")
        if not b64:
            continue
        if not b64.startswith("data:"):
            src = f"data:image/jpeg;base64,{b64}"
        else:
            src = b64
        parts.append(f'<img src="{src}" style="{s["bodyimg"]}">')
        if img.get("caption"):
            parts.append(f'<p style="{s["cap"]}">{img["caption"]}</p>')
    return "\n  ".join(parts)


def build_medical_html(article, s):
    """构建医学/专业提醒框（可选）"""
    if not article.get("medical_items"):
        return ""
    parts = [f'<section style="{s["med"]}">']
    if article.get("medical_title"):
        parts.append(f'<h4 style="{s["medh"]}">{article["medical_title"]}</h4>')
    parts.append("<ul>")
    for item in article["medical_items"]:
        parts.append(f'<li style="{s["medli"]}">{item}</li>')
    parts.append("</ul>")
    parts.append("</section>")
    if article.get("medical_note"):
        parts.append(f'<p style="{s["mednote"]}">{article["medical_note"]}</p>')
    return "\n  ".join(parts)


def build_source_html(article, s):
    """构建原文来源 + 版权声明"""
    parts = [f'<section style="{s["src"]}">']
    if article.get("source_url"):
        parts.append(f'<p style="{s["srct"]}">原文来源 · 点击阅读原文（尊重版权）</p>')
        label = article.get("source_label", "原文链接")
        parts.append(
            f'<a style="{s["srcl"]}" href="{article["source_url"]}" target="_blank" rel="noopener">{label}</a>'
        )
    parts.append(
        f'<p style="{s["srcn"]}">本文为独立评论文章，仅对原文的公共传播包装进行解构；'
        f'专业内容均引自上述原文，版权归原作者及首发媒体所有。</p>'
    )
    parts.append("</section>")
    return "\n  ".join(parts)


def build_wechat_html(article):
    """
    主函数：接收 article dict，返回微信版 HTML 字符串。
    全内联样式，零 <style>，零 class，兼容微信编辑器白名单。
    """
    template_name = article.get("template", "classic")
    s = STYLES.get(template_name, STYLES["classic"])

    title   = article.get("title", "")
    date    = article.get("date", "")
    author  = article.get("author", "毒舌职场真相官")
    lead    = article.get("lead", "")
    verdict = article.get("verdict", "")
    sections = article.get("sections", [])
    judge_title = article.get("judge_title", "[最后的判词]")
    judge_body  = article.get("judge_body", "")
    footer  = article.get("footer", f"本文为「{author}」专栏评论文章。© {date[:4] if date else '2026'} {author}")
    cover_b64 = article.get("cover_b64", "")
    images    = article.get("images", [])

    # 构建封面图
    cover_html = ""
    if cover_b64:
        if not cover_b64.startswith("data:"):
            cover_src = f"data:image/jpeg;base64,{cover_b64}"
        else:
            cover_src = cover_b64
        cover_html = f'<img src="{cover_src}" style="{s["bodyimg"]}">'

    # 构建各部分
    sections_html = build_sections_html(sections, s)
    images_html   = build_images_html(images, s)
    medical_html  = build_medical_html(article, s)
    source_html   = build_source_html(article, s)

    # 组装完整 HTML
    html = f"""<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{title}</title>
</head>
<body>
<section style="{s["section"]}">

  {cover_html}

  <h1 style="{s["h1"]}">{title}</h1>

  <p style="{s["meta"]}"><b style="{s["author_b"]}">{author}</b> · 原创评论 &nbsp;|&nbsp; {date}</p>

  <p style="{s["lead"]}">{lead}</p>

  <p style="{s["tag"]}">[真相翻译官]</p>
  <p style="{s["p"]}">{verdict}</p>

  {images_html}

  {sections_html}

  <section style="{s["judge"]}">
    <b style="{s["judge_b"]}">{judge_title}</b><br>
    {judge_body}
  </section>

  {medical_html}

  <p style="{s["foot"]}">{footer}</p>

  {source_html}

</section>
</body>
</html>"""

    return html


# ============================================================
# CLI 入口
# ============================================================

def main():
    parser = argparse.ArgumentParser(description="生成微信版公众号 HTML")
    parser.add_argument("--config", required=True, help="article.json 配置文件路径")
    parser.add_argument("--out", default=None, help="输出文件路径（默认: 真相官-<title>-公众号-微信版.html）")
    args = parser.parse_args()

    with io.open(args.config, "r", encoding="utf-8") as f:
        article = json.load(f)

    html = build_wechat_html(article)

    if args.out:
        out_path = args.out
    else:
        safe_title = re.sub(r'[\\/:*?"<>|]', "", article.get("title", "untitled"))[:30]
        out_path = f"真相官-{safe_title}-公众号-微信版.html"

    with io.open(out_path, "w", encoding="utf-8") as f:
        f.write(html)

    print(f"OK -> {out_path} (size={len(html)})")

    # 同时输出 body 内容供 inject_body.js 使用
    body_match = re.search(r"<body>(.*)</body>", html, re.DOTALL)
    if body_match:
        body_path = out_path.replace(".html", "_body.html")
        with io.open(body_path, "w", encoding="utf-8") as f:
            f.write(body_match.group(1).strip())
        print(f"Body -> {body_path} (供 inject_body.js 注入用)")


if __name__ == "__main__":
    main()
