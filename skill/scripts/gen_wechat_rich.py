#!/usr/bin/env python3
"""生成适合微信公众号的白名单富文本 HTML。"""

from html import escape


TEMPLATES = {
    "cool": {
        "accent": "#296cd0",
        "accent_soft": "#eef4fd",
        "quote_bg": "#f4f7fb",
        "kicker_bg": "#296cd0",
        "title_color": "#16202c",
        "body_color": "#2c3440",
        "judge_border": "#296cd0",
        "judge_bg": "#eef4fd",
    },
    "classic": {
        "accent": "#c0392b",
        "accent_soft": "#fdf1ef",
        "quote_bg": "#faf3f2",
        "kicker_bg": "#c0392b",
        "title_color": "#261d1b",
        "body_color": "#3a302e",
        "judge_border": "#c0392b",
        "judge_bg": "#fdf1ef",
    },
    "warm": {
        "accent": "#a8742a",
        "accent_soft": "#fbf5e9",
        "quote_bg": "#f8f4ea",
        "kicker_bg": "#a8742a",
        "title_color": "#2e2419",
        "body_color": "#3d332a",
        "judge_border": "#a8742a",
        "judge_bg": "#fbf5e9",
    },
}


def esc(text):
    return escape(str(text or ""), quote=False)


def image_block(image, accent):
    if not image or not image.get("b64"):
        return ""
    mime = image.get("mime", "image/jpeg")
    return (
        '<p style="text-align:center;margin:18px 0;">'
        f'<img src="data:{mime};base64,{image["b64"]}" '
        'style="max-width:90%;border-radius:6px;" /><br/>'
        f'<span style="font-size:12px;color:#9a9a9a;">{esc(image.get("caption"))}</span></p>'
    )


def build_rich_body(article, issue_no=None):
    tpl = TEMPLATES.get(article.get("template", "cool"), TEMPLATES["cool"])
    accent = tpl["accent"]
    parts = []

    kicker = "毒舌职场真相官"
    if issue_no:
        kicker += f" · 第{issue_no}期"
    parts.append(
        '<p style="text-align:center;margin:6px 0 14px;">'
        f'<span style="display:inline-block;padding:5px 16px;font-size:13px;'
        f'color:#ffffff;background-color:{tpl["kicker_bg"]};border-radius:12px;letter-spacing:2px;">'
        f'{esc(kicker)}</span></p>'
    )

    title_main = article["title"].split("|")[-1].strip()
    parts.append(
        f'<p style="text-align:center;margin:0 0 6px;"><strong style="font-size:20px;'
        f'color:{tpl["title_color"]};letter-spacing:1px;">{esc(title_main)}</strong></p>'
    )
    if article.get("author"):
        parts.append(
            f'<p style="text-align:center;margin:0 0 16px;"><span style="font-size:13px;'
            f'color:#9a9a9a;letter-spacing:1px;">{esc(article["author"])}</span></p>'
        )

    parts.append(
        f'<p style="text-align:center;margin:0 0 18px;"><span style="color:{accent};'
        'font-size:12px;letter-spacing:8px;">◆ ◆ ◆</span></p>'
    )

    parts.append(
        f'<p style="border-left:4px solid {accent};background-color:{tpl["accent_soft"]};'
        'padding:14px 16px;margin:0 0 20px;border-radius:0 4px 4px 0;line-height:1.9;'
        f'font-size:15px;color:{tpl["body_color"]};"><strong style="color:{accent};">开腔 | </strong>'
        f'{esc(article["lead"])}</p>'
    )
    parts.append(
        f'<p style="background-color:{tpl["quote_bg"]};padding:14px 16px;margin:0 0 22px;'
        f'border-radius:6px;line-height:1.9;font-size:15px;color:{tpl["body_color"]};">'
        f'<strong style="color:{accent};">真相一句话：</strong>{esc(article["verdict"])}</p>'
    )

    images = [item for item in article.get("images", []) if item.get("b64")][:2]
    if images:
        parts.append(image_block(images[0], accent))

    for section in article.get("sections", []):
        parts.append(
            f'<p style="margin:24px 0 10px;font-size:16px;font-weight:bold;color:{tpl["title_color"]};'
            f'line-height:1.6;"><span style="display:inline-block;width:8px;height:8px;'
            f'background-color:{accent};border-radius:2px;margin-right:8px;"></span>{esc(section["heading"])}</p>'
        )
        parts.append(
            f'<p style="background-color:{tpl["quote_bg"]};padding:10px 14px;margin:0 0 12px;'
            'border-radius:4px;line-height:1.8;font-size:14px;color:#8a8a8a;">'
            f'原文说：“{esc(section["quote"])}”</p>'
        )
        parts.append(
            f'<p style="margin:0 0 18px;font-size:15px;line-height:1.95;color:{tpl["body_color"]};">'
            f'{esc(section["comment"])}</p>'
        )

    if len(images) > 1:
        parts.append(image_block(images[1], accent))

    parts.append(
        f'<p style="border:1px solid {tpl["judge_border"]};background-color:{tpl["judge_bg"]};'
        'padding:16px 18px;margin:26px 0;border-radius:8px;line-height:1.95;'
        f'font-size:15px;color:{tpl["body_color"]};"><strong style="color:{tpl["judge_border"]};letter-spacing:2px;">'
        f'⚖ 最后的判词</strong><br/>{esc(article["judge_body"])}</p>'
    )

    parts.append(
        '<p style="border-top:1px solid #e8e8e8;margin:22px 0 0;padding-top:12px;'
        'font-size:12px;line-height:1.8;color:#b0b0b0;text-align:center;">'
        f'{esc(article.get("source_label"))}<br/>{esc(article.get("footer"))}</p>'
    )
    return "".join(parts)


def build_rich_html(article, issue_no=None):
    body = build_rich_body(article, issue_no)
    return (
        '<!DOCTYPE html>\n<html>\n<head>\n<meta charset="utf-8"/>\n'
        f'<title>{esc(article["title"])}</title>\n'
        '<style>body{margin:0;padding:16px;background:#ffffff;}</style>\n'
        f'</head>\n<body>\n<section style="max-width:677px;margin:0 auto;">{body}</section>\n'
        '</body>\n</html>'
    )
