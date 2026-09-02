#!/usr/bin/env python3
"""
真相官文章 — 微信富格式模板（白名单兼容版）
设计原则：
1. 只用微信白名单标签: section / p / span / strong / img
2. 只用白名单CSS: color, background-color, font-size, font-weight, line-height,
   text-align, margin, padding, border, border-radius, letter-spacing
   （135编辑器/秀米模板全部基于这些属性，粘贴后稳定保留）
3. 图片用 base64 —— 必须通过"真实粘贴"进入编辑器，
   微信会自动转存到自己的CDN并重写src为 mmbiz.qpic.cn
4. 浅底深字，即使部分样式被过滤，文字依然可读
"""

TEMPLATES = {
    # 冷峻蓝 — AI/科技话题
    "cool": {
        "accent": "#296cd0", "accent_soft": "#eef4fd",
        "quote_bg": "#f4f7fb", "kicker_bg": "#296cd0",
        "title_color": "#16202c", "body_color": "#2c3440",
        "judge_border": "#296cd0", "judge_bg": "#eef4fd",
    },
    # 正红 — 职场硬话题
    "classic": {
        "accent": "#c0392b", "accent_soft": "#fdf1ef",
        "quote_bg": "#faf3f2", "kicker_bg": "#c0392b",
        "title_color": "#261d1b", "body_color": "#3a302e",
        "judge_border": "#c0392b", "judge_bg": "#fdf1ef",
    },
    # 暖金 — 消费/生活话题
    "warm": {
        "accent": "#a8742a", "accent_soft": "#fbf5e9",
        "quote_bg": "#f8f4ea", "kicker_bg": "#a8742a",
        "title_color": "#2e2419", "body_color": "#3d332a",
        "judge_border": "#a8742a", "judge_bg": "#fbf5e9",
    },
}


def esc(t):
    return (t or "").replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def build_rich_body(article, issue_no=None):
    """生成富格式正文HTML（<p> 标签版，微信粘贴最稳）"""
    tpl = TEMPLATES.get(article.get("template", "cool"), TEMPLATES["cool"])
    a = tpl["accent"]

    kicker_text = "毒舌职场真相官"
    if issue_no:
        kicker_text += f" · 第{issue_no}期"

    parts = []

    # ---- 顶部 kicker ----
    parts.append(
        f'<p style="text-align:center;margin:6px 0 14px;">'
        f'<span style="display:inline-block;padding:5px 16px;font-size:13px;'
        f'color:#ffffff;background-color:{tpl["kicker_bg"]};border-radius:12px;'
        f'letter-spacing:2px;">{esc(kicker_text)}</span></p>'
    )

    # ---- 标题区 ----
    title_main = article["title"].split("|")[-1].strip()
    parts.append(
        f'<p style="text-align:center;margin:0 0 6px;">'
        f'<strong style="font-size:20px;color:{tpl["title_color"]};letter-spacing:1px;">'
        f'{esc(title_main)}</strong></p>'
    )
    parts.append(
        f'<p style="text-align:center;margin:0 0 16px;">'
        f'<span style="font-size:13px;color:#9a9a9a;letter-spacing:1px;">'
        f'{esc(article.get("author", ""))} · {esc(article.get("date", ""))}</span></p>'
    )

    # ---- 分隔符 ----
    parts.append(
        f'<p style="text-align:center;margin:0 0 18px;">'
        f'<span style="color:{a};font-size:12px;letter-spacing:8px;">◆ ◆ ◆</span></p>'
    )

    # ---- 导语块（左边框强调）----
    parts.append(
        f'<p style="border-left:4px solid {a};background-color:{tpl["accent_soft"]};'
        f'padding:14px 16px;margin:0 0 20px;border-radius:0 4px 4px 0;line-height:1.9;'
        f'font-size:15px;color:{tpl["body_color"]};">'
        f'<strong style="color:{a};">开腔 | </strong>{esc(article["lead"])}</p>'
    )

    # ---- 一句话判词 ----
    parts.append(
        f'<p style="background-color:{tpl["quote_bg"]};padding:14px 16px;margin:0 0 22px;'
        f'border-radius:6px;line-height:1.9;font-size:15px;color:{tpl["body_color"]};">'
        f'<strong style="color:{a};">真相一句话：</strong>{esc(article["verdict"])}</p>'
    )

    # ---- 配图（第一张放导语后）----
    images = article.get("images") or []
    if images and images[0].get("b64"):
        img = images[0]
        parts.append(
            f'<p style="text-align:center;margin:18px 0;">'
            f'<img src="data:image/jpeg;base64,{img["b64"]}" '
            f'style="max-width:90%;border-radius:6px;" /><br/>'
            f'<span style="font-size:12px;color:#9a9a9a;">{esc(img.get("caption", ""))}</span></p>'
        )

    # ---- 分节深拆解 ----
    for sec in article.get("sections", []):
        # 小节标题
        parts.append(
            f'<p style="margin:24px 0 10px;font-size:16px;font-weight:bold;color:{tpl["title_color"]};'
            f'line-height:1.6;"><span style="display:inline-block;width:8px;height:8px;'
            f'background-color:{a};border-radius:2px;margin-right:8px;"></span>'
            f'{esc(sec["heading"])}</p>'
        )
        # 引文块
        parts.append(
            f'<p style="background-color:{tpl["quote_bg"]};padding:10px 14px;'
            f'margin:0 0 12px;border-radius:4px;line-height:1.8;font-size:14px;color:#8a8a8a;">'
            f'原文说：「{esc(sec["quote"])}」</p>'
        )
        # 点评
        parts.append(
            f'<p style="margin:0 0 18px;font-size:15px;line-height:1.95;color:{tpl["body_color"]};">'
            f'{esc(sec["comment"])}</p>'
        )

    # ---- 中部配图（第二张如有）----
    if len(images) > 1 and images[1].get("b64"):
        img = images[1]
        parts.append(
            f'<p style="text-align:center;margin:18px 0;">'
            f'<img src="data:image/jpeg;base64,{img["b64"]}" '
            f'style="max-width:90%;border-radius:6px;" /><br/>'
            f'<span style="font-size:12px;color:#9a9a9a;">{esc(img.get("caption", ""))}</span></p>'
        )

    # ---- 最后的判词 ----
    parts.append(
        f'<p style="border:1px solid {tpl["judge_border"]};background-color:{tpl["judge_bg"]};'
        f'padding:16px 18px;margin:26px 0;border-radius:8px;line-height:1.95;'
        f'font-size:15px;color:{tpl["body_color"]};">'
        f'<strong style="color:{tpl["judge_border"]};letter-spacing:2px;">⚖ 最后的判词</strong><br/>'
        f'{esc(article["judge_body"])}</p>'
    )

    # ---- 页脚 ----
    parts.append(
        f'<p style="border-top:1px solid #e8e8e8;margin:22px 0 0;padding-top:12px;'
        f'font-size:12px;line-height:1.8;color:#b0b0b0;text-align:center;">'
        f'{esc(article.get("source_label", ""))}<br/>{esc(article.get("footer", ""))}</p>'
    )

    return "".join(parts)


def build_rich_html(article, issue_no=None):
    """完整HTML外壳（本地预览用）"""
    body = build_rich_body(article, issue_no)
    return (
        "<!DOCTYPE html>\n<html>\n<head>\n<meta charset=\"utf-8\"/>\n"
        f"<title>{esc(article['title'])}</title>\n"
        "<style>body{margin:0;padding:16px;background:#ffffff;}</style>\n"
        "</head>\n<body>\n"
        f'<section style="max-width:677px;margin:0 auto;">{body}</section>\n'
        "</body>\n</html>"
    )
