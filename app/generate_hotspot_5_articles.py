#!/usr/bin/env python3
"""Generate 5 WeChat-ready hotspot drafts with mobile-friendly images."""

import base64
import io
import json
import re
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path("D:/wechat")
OUT_DIR = ROOT / "content" / "drafts" / "2026-08-16-hotspots-5"
IMG_DIR = OUT_DIR / "images"


def font(size: int, bold: bool = False):
    candidates = [
        "C:/Windows/Fonts/msyhbd.ttc" if bold else "C:/Windows/Fonts/msyh.ttc",
        "C:/Windows/Fonts/simhei.ttf",
        "C:/Windows/Fonts/simsun.ttc",
    ]
    for item in candidates:
        try:
            return ImageFont.truetype(item, size)
        except Exception:
            pass
    return ImageFont.load_default()


def wrap_text(draw, text, fnt, max_width):
    lines, buf = [], ""
    for ch in text:
        test = buf + ch
        if draw.textbbox((0, 0), test, font=fnt)[2] <= max_width:
            buf = test
        else:
            if buf:
                lines.append(buf)
            buf = ch
    if buf:
        lines.append(buf)
    return lines


def make_card(path: Path, title: str, subtitle: str, palette: tuple[str, str, str], square=False):
    w, h = (900, 900) if square else (1200, 675)
    img = Image.new("RGB", (w, h), palette[1])
    draw = ImageDraw.Draw(img)
    accent = palette[0]
    dark = palette[2]
    # geometric but mobile-friendly, no tiny details
    draw.rectangle((0, 0, w, 72), fill=accent)
    draw.ellipse((w - 360, -120, w + 120, 360), fill=(255, 255, 255))
    draw.ellipse((w - 335, -95, w + 95, 335), fill=palette[1])
    draw.rectangle((60, h - 116, w - 60, h - 70), fill=(255, 255, 255))
    draw.rectangle((60, h - 116, 260, h - 70), fill=accent)
    draw.text((82, h - 108), "真相官", font=font(28, True), fill="white")
    draw.text((278, h - 108), subtitle, font=font(26), fill=dark)
    title_font = font(54 if len(title) < 24 else 48, True)
    y = 160 if not square else 220
    for line in wrap_text(draw, title, title_font, w - 160)[:4]:
        draw.text((80, y), line, font=title_font, fill=dark)
        y += 68
    draw.line((80, y + 12, min(w - 80, 80 + len(title) * 18), y + 12), fill=accent, width=8)
    path.parent.mkdir(parents=True, exist_ok=True)
    q = 86
    while True:
        buf = io.BytesIO()
        img.save(buf, "JPEG", quality=q, optimize=True, progressive=True)
        data = buf.getvalue()
        if len(data) < 950_000 or q <= 64:
            path.write_bytes(data)
            return {"path": str(path), "bytes": len(data), "width": w, "height": h}
        q -= 6


def img_b64(path: Path):
    data = path.read_bytes()
    return base64.b64encode(data).decode("ascii"), len(data)


def esc(text):
    return (text or "").replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def p(text):
    return f'<p style="margin:0 0 18px;font-size:15px;line-height:1.95;color:#333;">{esc(text)}</p>'


def render(article):
    accent = article["accent"]
    parts = []
    parts.append(f'<p style="text-align:center;margin:6px 0 14px;"><span style="display:inline-block;padding:5px 16px;font-size:13px;color:#fff;background-color:{accent};border-radius:12px;letter-spacing:2px;">毒舌职场真相官 · 第{article["issue"]}期</span></p>')
    parts.append(f'<p style="text-align:center;margin:0 0 6px;"><strong style="font-size:20px;color:#20252b;letter-spacing:1px;">{esc(article["title"])}</strong></p>')
    parts.append('<p style="text-align:center;margin:0 0 18px;"><span style="color:#999;font-size:12px;letter-spacing:8px;">◆ ◆ ◆</span></p>')
    parts.append(f'<p style="border-left:4px solid {accent};background-color:#f6f8fb;padding:14px 16px;margin:0 0 20px;border-radius:0 4px 4px 0;line-height:1.9;font-size:15px;color:#333;"><strong style="color:{accent};">开腔 | </strong>{esc(article["lead"])}</p>')
    parts.append(f'<p style="background-color:#f4f7fb;padding:14px 16px;margin:0 0 22px;border-radius:6px;line-height:1.9;font-size:15px;color:#333;"><strong style="color:{accent};">真相一句话：</strong>{esc(article["verdict"])}</p>')
    for idx, image in enumerate(article["images"]):
        b64, _ = img_b64(Path(image["path"]))
        if idx == 1:
            # second image after two sections
            continue
        parts.append(f'<p style="text-align:center;margin:18px 0;"><img src="data:image/jpeg;base64,{b64}" style="max-width:90%;border-radius:6px;" /><br/><span style="font-size:12px;color:#999;">{esc(image["caption"])}</span></p>')
    for i, section in enumerate(article["sections"]):
        parts.append(f'<p style="margin:24px 0 10px;font-size:16px;font-weight:bold;color:#20252b;line-height:1.6;"><span style="display:inline-block;width:8px;height:8px;background-color:{accent};border-radius:2px;margin-right:8px;"></span>{esc(section["heading"])}</p>')
        parts.append(f'<p style="background-color:#f7f7f7;padding:10px 14px;margin:0 0 12px;border-radius:4px;line-height:1.8;font-size:14px;color:#777;">原文说：{esc(section["quote"])}</p>')
        parts.append(p(section["comment"]))
        if i == 1 and len(article["images"]) > 1:
            b64, _ = img_b64(Path(article["images"][1]["path"]))
            parts.append(f'<p style="text-align:center;margin:18px 0;"><img src="data:image/jpeg;base64,{b64}" style="max-width:90%;border-radius:6px;" /><br/><span style="font-size:12px;color:#999;">{esc(article["images"][1]["caption"])}</span></p>')
    parts.append(f'<p style="border:1px solid {accent};background-color:#f6f8fb;padding:16px 18px;margin:26px 0;border-radius:8px;line-height:1.95;font-size:15px;color:#333;"><strong style="color:{accent};letter-spacing:2px;">⚖ 最后的判词</strong><br/>{esc(article["judge_body"])}</p>')
    parts.append('<p style="border-top:1px solid #e8e8e8;margin:22px 0 0;padding-top:12px;font-size:12px;line-height:1.8;color:#aaa;text-align:center;">本文为“毒舌职场真相官”专栏评论，事实方向依据公开报道与公众号后台选题观察，观点部分为评论。</p>')
    body = "".join(parts)
    return f'<!DOCTYPE html><html><head><meta charset="utf-8"/><title>{esc(article["title"])}</title></head><body><section style="max-width:677px;margin:0 auto;">{body}</section></body></html>'


ARTICLES = [
    {
        "issue": 32,
        "title": "工资不涨，AI先涨：老板买的不是效率，是裁员理由",
        "slug": "ai-efficiency-layoff-excuse",
        "accent": "#296cd0",
        "palette": ("#296cd0", "#eef4fd", "#16202c"),
        "lead": "后台数据已经说明一件事：这个号现在不是靠熟人慢慢养，而是靠能不能被转发。什么最容易被转？不是宏大叙事，是每个人都能对号入座的恐惧。AI提效就是这种恐惧的最佳包装——老板嘴上说拥抱工具，手里算的是同样的活，能不能少发几份工资。",
        "verdict": "AI最先改变的不是生产力，而是裁员话术：以前叫压缩编制，现在叫组织效率升级。",
        "sections": [
            {"heading": "一、提效不是目的，可量化才是目的", "quote": "企业越来越强调AI工具使用率、流程自动化和人效指标。", "comment": "真正危险的不是公司让你用AI，而是公司终于找到了一个看起来很科学的方式，把你的价值拆成次数、时长、产出和响应速度。人一旦被拆成指标，讨论工资就变成讨论参数；讨论裁员，就变成讨论模型。"},
            {"heading": "二、最会用AI的人，也可能最先被系统吃掉", "quote": "AI可以让一个人完成过去几个人的工作。", "comment": "这句话听起来像夸奖，其实像警报。一个人能干三个人的活，不代表他会拿三个人的钱，更可能意味着旁边两个人先消失，然后他继续拿一份工资。效率红利从来不会自动流向员工，它通常先流向报表。"},
            {"heading": "三、老板最爱的不是AI，是责任外包", "quote": "决策会参考算法建议和业务数据。", "comment": "参考两个字很妙。结果好，是管理层英明；结果坏，是系统建议。AI成了一个不会反驳、不会领年终奖、也不会被追责的完美替罪羊。管理层真正买到的，不是智能，是距离。"},
        ],
        "judge_body": "这类热点真正值得拆的，不是AI会不会抢饭碗，而是公司会不会借AI重新定义饭碗。技术本身没有立场，但买技术的人有预算、有考核、有裁员压力。所谓提效，最后如果只剩员工更忙、岗位更少、责任更虚，那它就不是生产力革命，而是一次穿着算法西装的成本转移。",
    },
    {
        "issue": 33,
        "title": "社保新账单来了：公司喊成本，打工人喊到手少",
        "slug": "social-security-paycheck",
        "accent": "#c0392b",
        "palette": ("#c0392b", "#fdf1ef", "#261d1b"),
        "lead": "每次社保话题一热，评论区都会自动分成两派：老板说经营压力大，员工说到手工资少。听起来双方都委屈，但真正该被看见的是：很多企业把合规当恩赐，很多员工把保障当奢侈，这本身就说明劳动关系已经拧巴到什么程度。",
        "verdict": "当一份合法保障被双方同时视为负担，问题就不在社保表格里，而在收入太薄、利润太急、风险全往个人身上推。",
        "sections": [
            {"heading": "一、老板喊成本时，别忘了那本来就是用工成本", "quote": "企业普遍关注社保缴纳带来的经营压力。", "comment": "用工不是只买八小时劳动力，还包括这个人病了、老了、受伤了以后不被生活一脚踢下楼。把社保叫成本没错，但把它说成额外负担就很滑稽。你不能一边要稳定员工，一边拒绝承担稳定员工的基本价格。"},
            {"heading": "二、员工怕缴社保，不是目光短浅，是现金流太短", "quote": "不少年轻人担心缴费后到手工资减少。", "comment": "站在宏观上，社保是未来安全垫；站在月底，它可能就是少吃几顿外卖、少还一点花呗、少给房东一点房租。一个人不是不懂长期主义，而是他的生活账本只允许他活到下个月。"},
            {"heading": "三、合规不能只靠员工替制度买单", "quote": "社保规范化需要企业、平台和劳动者共同适应。", "comment": "最糟糕的改法是：制度要求更严，企业成本不想涨，平台抽成不想降，最后员工到手工资减少。那就不是保障升级，而是换一种名义继续压缩底层现金流。真正的改革，不能只让最没议价权的人负责懂事。"},
        ],
        "judge_body": "社保争议的底层不是缴不缴，而是谁来付这笔现代劳动关系的账。企业习惯了低成本用人，员工习惯了裸奔式现金流，平台习惯了把风险留给个体。现在账单摊开，所有人都喊疼。可疼不代表不该治病，疼只说明这个病拖得太久了。",
    },
    {
        "issue": 34,
        "title": "情绪消费爆了：年轻人不是乱花钱，是给生活买止痛片",
        "slug": "emotion-consumption-painkiller",
        "accent": "#a8742a",
        "palette": ("#a8742a", "#fbf5e9", "#2e2419"),
        "lead": "后台草稿里，谷子、演唱会、宠物、县城游这一组题天然连在一起。它们表面上是消费，底层都是同一种东西：年轻人在用有限的钱，买一点可控、可期待、可表达的情绪补偿。别急着骂他们不理性，很多时候这已经是他们最理性的自救。",
        "verdict": "情绪消费不是消费主义胜利，而是现实生活太缺情绪出口，商家只是最先发现了这个缺口可以收费。",
        "sections": [
            {"heading": "一、年轻人买的不是东西，是被理解的错觉", "quote": "情绪价值成为消费决策中的高频关键词。", "comment": "一个徽章、一场演出、一只宠物、一杯好看的咖啡，本身都不神圣。神圣的是它们能让人短暂离开绩效、房租、催婚和消息轰炸。商品不再只是功能，它开始扮演一个安静听你说话的朋友。"},
            {"heading": "二、越没安全感，越需要小确定性", "quote": "消费者更愿意为陪伴感、仪式感和身份认同付费。", "comment": "宏大未来太贵，房子太远，升职太玄，结婚太重，只有一个小玩具、一张票、一顿饭，能立刻兑换成快乐。所谓冲动消费，很多时候不是失控，而是在一个失控的世界里，努力抓住一点自己说了算的东西。"},
            {"heading": "三、商家最懂的不是年轻人，是年轻人的缺口", "quote": "品牌开始围绕圈层、陪伴和情绪共鸣设计产品。", "comment": "别把商家的共情想得太纯。他们不是突然理解你了，他们只是发现你孤独、焦虑、疲惫，而且愿意为被看见付费。情绪价值一旦被工业化，就会从安慰变成订阅制止痛片。"},
        ],
        "judge_body": "这波情绪消费最讽刺的地方在于：上一代骂年轻人不存钱，年轻人说我连情绪都快存不住了。社会提供不了稳定的工作、可负担的房子和温和的人际关系，市场就会出来卖一切替代品。骂消费容易，承认生活本身太苦比较难。",
    },
    {
        "issue": 35,
        "title": "机器人进厂之后：最先失业的不是工人，是中层的借口",
        "slug": "robots-factory-middle-management",
        "accent": "#296cd0",
        "palette": ("#296cd0", "#eef4fd", "#16202c"),
        "lead": "机器人、自动化、具身智能这些词一上热搜，大家第一反应是工人要没饭吃。这个担心当然真实，但我更想提醒另一件事：当机器真的能稳定干活，很多中层最常用的管理话术也会一起失效。以前你可以把低效甩给一线，现在系统会把甩锅链条照得很亮。",
        "verdict": "机器人进入工厂，替代的不只是双手，也会替代一批靠信息差、催进度和甩责任活着的管理岗位。",
        "sections": [
            {"heading": "一、机器不会摸鱼，也不会替领导背锅", "quote": "制造业越来越多引入自动化、机器人和智能调度系统。", "comment": "工人会累、会请假、会争取加班费，机器不会。但机器也有一个麻烦：它会忠实记录每一次停机、返工和流程卡点。以前某些问题能靠骂一线遮过去，未来可能直接显示在看板上。"},
            {"heading": "二、一线被替代之前，先被重新定价", "quote": "岗位从重复劳动转向设备维护、数据标注和现场协同。", "comment": "真正残酷的是过渡期。企业不会立刻把所有人换掉，而是先要求工人会操作设备、会看数据、会处理异常，然后工资最好还按原来的给。岗位升级听起来很美，账单如果不升级，就是变相加码。"},
            {"heading": "三、中层最怕透明，因为透明会暴露管理含金量", "quote": "智能系统让生产流程和绩效指标更加可视化。", "comment": "一旦流程透明，谁制造等待，谁反复改需求，谁只会催进度不解决问题，就藏不住了。很多管理岗位的价值不是决策，而是把混乱翻译成一线的压力。机器未必懂人性，但它很擅长记录混乱从哪里开始。"},
        ],
        "judge_body": "机器人进厂不是一部简单的失业恐怖片，它更像一盏冷光灯：照到工人的饭碗，也照到管理层的水分。未来最危险的人，不一定是不会拧螺丝的人，而是除了催人拧螺丝，什么也不会的人。",
    },
    {
        "issue": 36,
        "title": "中年人重新找工作：最先被嫌弃的不是年龄，是工资记忆",
        "slug": "middle-age-job-salary-memory",
        "accent": "#c0392b",
        "palette": ("#c0392b", "#fdf1ef", "#261d1b"),
        "lead": "就业市场里最残忍的词，不是失业，是重新定价。一个人在行业里干了十几年，突然发现自己过去的薪资、职级、经验，到了新市场上都要打折。招聘方嘴上说年龄问题，实际嫌弃的是你还记得自己曾经值多少钱。",
        "verdict": "中年求职最难的不是简历不够厚，而是市场想买你的经验，却不想支付你曾经的价格。",
        "sections": [
            {"heading": "一、年龄只是表面，成本才是底层", "quote": "不少中年求职者遭遇岗位变少、薪资下调和周期拉长。", "comment": "公司当然不会直说我嫌你贵，它会说你不够灵活、不够年轻、不够有潜力。翻译一下就是：你知道劳动的价格，也知道加班的成本，不像新人那么好重新塑形。年龄歧视的皮下面，常常是成本歧视。"},
            {"heading": "二、经验变成资产，前提是有人愿意买", "quote": "企业更偏好低成本、可快速上手且服从性强的人选。", "comment": "经验不是天然资产，它只有在对方承认复杂问题需要经验时才值钱。如果公司只想找一个会执行、不问为什么、还能熬夜的人，中年人的经验就会被说成路径依赖。不是你没价值，是买家只想逛清仓区。"},
            {"heading": "三、降薪不是失败，是市场在逼你忘记过去", "quote": "许多人在重新就业时被迫接受更低薪资或转向灵活岗位。", "comment": "最痛的不是钱少，而是身份被改写。昨天你还是负责人，今天你要解释为什么愿意从头做起。职场最会制造羞耻感：它先让你把青春卖给增长，再在增长放缓时告诉你，你太贵了。"},
        ],
        "judge_body": "中年求职不是个人不努力的故事，而是企业在周期下行时重新分配尊严的故事。它想要你的成熟、稳定和抗压，却不想承认这些东西是用十几年生活换来的。所谓年龄危机，本质是工资记忆和低价市场之间的冲突。",
    },
]


def main():
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    IMG_DIR.mkdir(parents=True, exist_ok=True)
    manifest = []
    for article in ARTICLES:
        slug = article["slug"]
        cover = IMG_DIR / f"{article['issue']:02d}-{slug}-cover.jpg"
        img1 = IMG_DIR / f"{article['issue']:02d}-{slug}-body1.jpg"
        img2 = IMG_DIR / f"{article['issue']:02d}-{slug}-body2.jpg"
        cover_info = make_card(cover, article["title"], "适合转发的职场真话", article["palette"], square=False)
        i1 = make_card(img1, article["verdict"], "真相一句话", article["palette"], square=True)
        i2 = make_card(img2, "不是观点变毒了，是现实没加糖", "最后的判词", article["palette"], square=True)
        article["cover_path"] = cover_info["path"]
        article["images"] = [
            {"path": i1["path"], "caption": "当热点变成账单，真相就开始露出来。"},
            {"path": i2["path"], "caption": "不是所有新词都代表进步，有些只是旧压力的新包装。"},
        ]
        html = render(article)
        html_path = OUT_DIR / f"{article['issue']:02d}-{slug}.html"
        json_path = OUT_DIR / f"{article['issue']:02d}-{slug}.json"
        html_path.write_text(html, encoding="utf-8")
        json_path.write_text(json.dumps(article, ensure_ascii=False, indent=2), encoding="utf-8")
        manifest.append({
            "no": article["issue"],
            "title": article["title"],
            "body_file": str(html_path),
            "cover_file": str(cover),
            "slug": slug,
            "body_chars": len(html),
            "cover_bytes": cover_info["bytes"],
            "body_image_bytes": [i1["bytes"], i2["bytes"]],
        })
    manifest_path = OUT_DIR / "manifest.json"
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps({"ok": True, "out": str(OUT_DIR), "manifest": str(manifest_path), "items": manifest}, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
