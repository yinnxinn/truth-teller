#!/usr/bin/env python3
"""
微信编辑器安全版 HTML 生成器

核心原则：
1. 只用 <p> 和 <span> 标签 — 不用 <section>/<h1>/<h3>/<div>
2. 只用微信确认支持的 CSS 属性 — 不用 display/border-radius/box-shadow
3. 浅底深字 — 所有模板都用浅色背景+深色文字，避免背景丢失后文字不可见
4. 扁平结构 — 零嵌套，所有元素都是 <p> 的直接子级
5. 图片分离 — 生成"纯文字版"（手动粘贴用）和"含图版"（CDP注入用）

用法:
  python gen_wechat_safe.py --config article.json --out 安全版-xxx.html
  python gen_wechat_safe.py --config article.json --out 安全版-xxx.html --no-images  # 纯文字版
"""

import json, sys, os, argparse, io, re

# ============================================================
# 微信安全样式 — 三套配色，全部浅底深字
# ============================================================

SAFE_STYLES = {
    # 经典白底 — 简洁专业
    "classic": {
        "title":      "font-size:22px;font-weight:bold;color:#1a1a1a;line-height:1.4;margin:0 0 8px;text-align:center;",
        "meta":       "font-size:13px;color:#999999;line-height:1.6;margin:0 0 20px;text-align:center;border-bottom:1px solid #eeeeee;padding-bottom:12px;",
        "lead":       "font-size:16px;line-height:1.85;color:#555555;margin:0 0 22px;text-indent:2em;",
        "tag":        "font-size:14px;font-weight:bold;color:#cc3333;margin:0 0 6px;",
        "body":       "font-size:16px;line-height:1.85;color:#333333;margin:0 0 18px;text-indent:2em;",
        "heading":    "font-size:17px;font-weight:bold;color:#1a1a1a;line-height:1.5;margin:26px 0 10px;",
        "quote":      "border-left:3px solid #cccccc;padding:8px 12px;margin:0 0 14px;font-size:15px;color:#888888;line-height:1.7;background-color:#f7f7f7;",
        "quote_label": "font-size:13px;color:#aaaaaa;",
        "judge_bg":   "background-color:#f5f5f5;border-left:4px solid #1a1a1a;",
        "judge":      "font-size:16px;line-height:1.85;color:#1a1a1a;padding:14px 16px;margin:14px 0 22px;",
        "judge_label":"color:#1a1a1a;font-weight:bold;",
        "img_cap":    "font-size:13px;color:#999999;text-align:center;margin:4px 0 20px;",
        "footer":     "font-size:12px;color:#aaaaaa;line-height:1.7;margin:16px 0 0;padding-top:12px;border-top:1px solid #eeeeee;",
        "src_title":  "font-size:13px;color:#888888;margin:12px 0 6px;padding-top:12px;border-top:1px solid #eeeeee;",
        "src_link":   "font-size:14px;color:#576b95;line-height:1.6;margin:0 0 8px;",
        "src_note":   "font-size:12px;color:#bbbbbb;line-height:1.6;margin:0;",
        "divider":    "font-size:14px;color:#cccccc;text-align:center;margin:24px 0;",
    },
    # 暖调米白 — 杂志感
    "warm": {
        "title":      "font-size:22px;font-weight:bold;color:#3d2b1f;line-height:1.4;margin:0 0 8px;text-align:center;",
        "meta":       "font-size:13px;color:#b0907a;line-height:1.6;margin:0 0 20px;text-align:center;border-bottom:1px solid #e8d5c4;padding-bottom:12px;",
        "lead":       "font-size:16px;line-height:1.85;color:#6b5a4e;margin:0 0 22px;text-indent:2em;",
        "tag":        "font-size:14px;font-weight:bold;color:#c0392b;margin:0 0 6px;",
        "body":       "font-size:16px;line-height:1.85;color:#4a3f35;margin:0 0 18px;text-indent:2em;",
        "heading":    "font-size:17px;font-weight:bold;color:#3d2b1f;line-height:1.5;margin:26px 0 10px;",
        "quote":      "border-left:3px solid #d4a574;padding:8px 12px;margin:0 0 14px;font-size:15px;color:#8a7560;line-height:1.7;background-color:#faf6f0;",
        "quote_label": "font-size:13px;color:#c4a882;",
        "judge_bg":   "background-color:#faf6f0;border-left:4px solid #c0392b;",
        "judge":      "font-size:16px;line-height:1.85;color:#3d2b1f;padding:14px 16px;margin:14px 0 22px;",
        "judge_label":"color:#c0392b;font-weight:bold;",
        "img_cap":    "font-size:13px;color:#b0907a;text-align:center;margin:4px 0 20px;",
        "footer":     "font-size:12px;color:#c4a882;line-height:1.7;margin:16px 0 0;padding-top:12px;border-top:1px solid #e8d5c4;",
        "src_title":  "font-size:13px;color:#8a7560;margin:12px 0 6px;padding-top:12px;border-top:1px solid #e8d5c4;",
        "src_link":   "font-size:14px;color:#c0392b;line-height:1.6;margin:0 0 8px;",
        "src_note":   "font-size:12px;color:#b0907a;line-height:1.6;margin:0;",
        "divider":    "font-size:14px;color:#d4a574;text-align:center;margin:24px 0;",
    },
    # 清爽蓝白 — 科技感
    "cool": {
        "title":      "font-size:22px;font-weight:bold;color:#1a3a5c;line-height:1.4;margin:0 0 8px;text-align:center;",
        "meta":       "font-size:13px;color:#88aabb;line-height:1.6;margin:0 0 20px;text-align:center;border-bottom:1px solid #d0e0ee;padding-bottom:12px;",
        "lead":       "font-size:16px;line-height:1.85;color:#556677;margin:0 0 22px;text-indent:2em;",
        "tag":        "font-size:14px;font-weight:bold;color:#0066cc;margin:0 0 6px;",
        "body":       "font-size:16px;line-height:1.85;color:#334455;margin:0 0 18px;text-indent:2em;",
        "heading":    "font-size:17px;font-weight:bold;color:#1a3a5c;line-height:1.5;margin:26px 0 10px;",
        "quote":      "border-left:3px solid #6699cc;padding:8px 12px;margin:0 0 14px;font-size:15px;color:#778899;line-height:1.7;background-color:#f0f5fa;",
        "quote_label": "font-size:13px;color:#88aabb;",
        "judge_bg":   "background-color:#f0f5fa;border-left:4px solid #0066cc;",
        "judge":      "font-size:16px;line-height:1.85;color:#1a3a5c;padding:14px 16px;margin:14px 0 22px;",
        "judge_label":"color:#0066cc;font-weight:bold;",
        "img_cap":    "font-size:13px;color:#88aabb;text-align:center;margin:4px 0 20px;",
        "footer":     "font-size:12px;color:#aabbcc;line-height:1.7;margin:16px 0 0;padding-top:12px;border-top:1px solid #d0e0ee;",
        "src_title":  "font-size:13px;color:#667788;margin:12px 0 6px;padding-top:12px;border-top:1px solid #d0e0ee;",
        "src_link":   "font-size:14px;color:#0066cc;line-height:1.6;margin:0 0 8px;",
        "src_note":   "font-size:12px;color:#88aabb;line-height:1.6;margin:0;",
        "divider":    "font-size:14px;color:#6699cc;text-align:center;margin:24px 0;",
    },
}


def build_safe_html(article, include_images=True):
    """
    构建微信编辑器安全版 HTML。
    
    核心策略：
    - 只用 <p> 标签，零嵌套
    - 全内联样式，只用微信白名单 CSS 属性
    - 浅底深字，避免背景丢失后文字不可见
    - 图片可选（含图版 vs 纯文字版）
    """
    template_name = article.get("template", "classic")
    # 安全版映射：dark->classic, magazine->warm
    template_map = {"dark": "cool", "classic": "classic", "magazine": "warm", "warm": "warm", "cool": "cool"}
    s = SAFE_STYLES.get(template_map.get(template_name, "classic"), SAFE_STYLES["classic"])

    title       = article.get("title", "")
    date        = article.get("date", "")
    author      = article.get("author", "毒舌职场真相官")
    lead        = article.get("lead", "")
    verdict     = article.get("verdict", "")
    sections    = article.get("sections", [])
    judge_title = article.get("judge_title", "[最后的判词]")
    judge_body  = article.get("judge_body", "")
    footer      = article.get("footer", f"本文为「{author}」专栏评论文章。© {date[:4] if date else '2026'} {author}")
    cover_b64   = article.get("cover_b64", "")
    images      = article.get("images", [])

    parts = []

    # --- 封面图（可选） ---
    if include_images and cover_b64:
        if not cover_b64.startswith("data:"):
            cover_src = f"data:image/jpeg;base64,{cover_b64}"
        else:
            cover_src = cover_b64
        parts.append(f'<p style="margin:0 0 16px;text-align:center;"><img src="{cover_src}" style="max-width:100%;height:auto;" alt="封面图"></p>')
    
    # --- 标题 ---
    parts.append(f'<p style="{s["title"]}">{title}</p>')
    
    # --- 作者信息 ---
    parts.append(f'<p style="{s["meta"]}"><span style="color:{_extract_color(s["tag"])};font-weight:bold;">{author}</span> · 原创评论 | {date}</p>')
    
    # --- 引言 ---
    if lead:
        parts.append(f'<p style="{s["lead"]}">{lead}</p>')
    
    # --- 分隔线 ---
    parts.append(f'<p style="{s["divider"]}">· · ·</p>')
    
    # --- 真相翻译官 ---
    parts.append(f'<p style="{s["tag"]}">[真相翻译官]</p>')
    parts.append(f'<p style="{s["body"]}">{verdict}</p>')
    
    # --- 配图（在真相翻译官之后） ---
    if include_images and images:
        for img in images:
            b64 = img.get("b64", "")
            if not b64:
                continue
            if not b64.startswith("data:"):
                src = f"data:image/jpeg;base64,{b64}"
            else:
                src = b64
            parts.append(f'<p style="margin:8px 0 4px;text-align:center;"><img src="{src}" style="max-width:100%;height:auto;" alt="配图"></p>')
            if img.get("caption"):
                parts.append(f'<p style="{s["img_cap"]}">{img["caption"]}</p>')
    elif not include_images and images:
        # 纯文字版：用文字标注图片位置
        parts.append(f'<p style="{s["img_cap"]}">[ 此处为配图 · 请在编辑器中手动插入 ]</p>')
    
    # --- 分隔线 ---
    parts.append(f'<p style="{s["divider"]}">· · ·</p>')
    
    # --- 毒舌深拆解 ---
    parts.append(f'<p style="{s["tag"]}">[毒舌深拆解]</p>')
    
    for sec in sections:
        # 小标题
        parts.append(f'<p style="{s["heading"]}">{sec["heading"]}</p>')
        # 原文摘录
        if sec.get("quote"):
            parts.append(f'<p style="{s["quote"]}"><span style="{s["quote_label"]}">原文摘录：</span>{sec["quote"]}</p>')
        # 点评
        if sec.get("comment"):
            parts.append(f'<p style="{s["body"]}">{sec["comment"]}</p>')
    
    # --- 分隔线 ---
    parts.append(f'<p style="{s["divider"]}">· · ·</p>')
    
    # --- 最后的判词 ---
    # 用 <p> + 背景色，不用 <section>
    parts.append(
        f'<p style="{s["judge_bg"]}{s["judge"]}">'
        f'<span style="{s["judge_label"]}">{judge_title}</span><br><br>'
        f'{judge_body}'
        f'</p>'
    )
    
    # --- 版权声明 ---
    parts.append(f'<p style="{s["footer"]}">{footer}</p>')
    
    # --- 原文来源 ---
    source_url = article.get("source_url", "")
    source_label = article.get("source_label", "原文链接")
    if source_url:
        parts.append(f'<p style="{s["src_title"]}">原文来源 · 点击阅读原文（尊重版权）</p>')
        parts.append(f'<p style="{s["src_link"]}"><a href="{source_url}" style="color:inherit;text-decoration:none;">{source_label}</a></p>')
        parts.append(f'<p style="{s["src_note"]}">本文为独立评论文章，仅对原文的公共传播包装进行解构；专业内容均引自上述原文，版权归原作者及首发媒体所有。</p>')
    
    # 组装完整 HTML
    body_content = "\n".join(parts)
    html = f"""<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{title}</title>
</head>
<body>
{body_content}
</body>
</html>"""
    
    return html


def _extract_color(style_str):
    """从 style 字符串中提取 color 值"""
    m = re.search(r'color:(#[0-9a-fA-F]+)', style_str)
    return m.group(1) if m else "#cc3333"


def main():
    parser = argparse.ArgumentParser(description="生成微信编辑器安全版 HTML")
    parser.add_argument("--config", required=True, help="article.json 配置文件路径")
    parser.add_argument("--out", default=None, help="输出文件路径")
    parser.add_argument("--no-images", action="store_true", help="生成纯文字版（不含图片，适合手动粘贴）")
    args = parser.parse_args()

    with io.open(args.config, "r", encoding="utf-8") as f:
        article = json.load(f)

    html = build_safe_html(article, include_images=not args.no_images)

    if args.out:
        out_path = args.out
    else:
        safe_title = re.sub(r'[\\/:*?"<>|]', "", article.get("title", "untitled"))[:30]
        suffix = "-纯文字版" if args.no_images else ""
        out_path = f"安全版{suffix}-{safe_title}.html"

    with io.open(out_path, "w", encoding="utf-8") as f:
        f.write(html)

    print(f"OK -> {out_path} (size={len(html):,})")


if __name__ == "__main__":
    main()
