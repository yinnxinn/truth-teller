"""生成一篇适合公众号草稿的中文富文本文章。"""

import base64
import io
import json
import sys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SKILL_SCRIPTS = ROOT / "skill" / "scripts"
IMAGE_DIR = ROOT / "assets" / "images" / "2026-08-15-ai评分裁员"
OUT_DIR = ROOT / "content" / "drafts" / "2026-08-15-ai评分裁员"
sys.path.insert(0, str(SKILL_SCRIPTS))

from gen_wechat_rich import build_rich_html  # noqa: E402


def image_data(filename, caption):
    path = IMAGE_DIR / filename
    if not path.exists():
        return {"filename": filename, "caption": caption}

    # 手机阅读优先：长边不超过 1200px，并将单张图控制在 1MB 内。
    with Image.open(path) as source:
        image = source.convert("RGB")
        image.thumbnail((1200, 1200), Image.Resampling.LANCZOS)
        output = io.BytesIO()
        image.save(output, format="JPEG", quality=82, optimize=True, progressive=True)
        compressed = output.getvalue()

    mobile_name = Path(filename).with_suffix(".jpg").name
    mobile_path = IMAGE_DIR / mobile_name
    mobile_path.write_bytes(compressed)
    return {
        "filename": mobile_name,
        "caption": caption,
        "mime": "image/jpeg",
        "width": image.width,
        "height": image.height,
        "bytes": len(compressed),
        "b64": base64.b64encode(compressed).decode("ascii"),
    }


ARTICLE = {
    "title": "真相官 | AI不会先裁掉你，它会先把你打成一个分数",
    "date": "2026-08-15",
    "author": "毒舌职场真相官",
    "template": "cool",
    "lead": (
        "最近一批 Meta 员工起诉公司，指控裁员名单使用了内部 AI 系统、工作活动数据、AI 使用看板和算法辅助绩效排名。"
        "公司当然不会说“我们用算法挑人”，它更愿意说：我们只是让管理更客观。可一旦一个人的房贷、病假和饭碗，"
        "都要先通过一个看不见的分数，所谓客观，就开始像一台没有申诉入口的绞肉机。"
    ),
    "verdict": (
        "AI 最危险的地方，不是马上替你上班，而是先把你压缩成一张绩效表，"
        "让公司可以用“系统判断”躲开“人做决定”。"
    ),
    "images": [
        image_data("ai评分裁员-1.png", "当人被压缩成一个分数，裁员就拥有了客观的外观"),
        image_data("ai评分裁员-2.png", "看板能记录敲键盘，却记录不了真正的工作"),
        image_data("ai评分裁员-3.png", "最冷的门，不是拒绝你，而是没有人承认门是他关的"),
    ],
    "sections": [
        {
            "heading": "一、“AI裁员”先把老板从现场移走",
            "quote": "算法辅助生成绩效排名，并参与确定裁员名单。",
            "comment": (
                "注意主语的变化：以前是“公司裁了你”，现在是“AI把你排到了后面”。前者需要一个能解释、能申诉、能承担责任的人；"
                "后者只需要一张看起来很科学的表。AI 没有裁员权，真正决定成本、岗位和名单的，始终是管理层。"
                "技术只是把决定套上了一件白大褂，让人误以为它没有偏好。"
                "算法不会替老板承担责任，但它很擅长替老板制造距离。"
            ),
        },
        {
            "heading": "二、键盘敲得多，不等于工作做得好",
            "quote": "工作活动监控数据、键盘操作和 AI 使用量被纳入判断。",
            "comment": (
                "当管理者不知道怎么衡量价值，就会开始数动作：敲了多少次键盘、开了多少次会、调用了多少 token、提交了多少条记录。"
                "于是，最容易被系统看见的人，变成最努力的人；最会留下痕迹的人，变成最有产出的人。"
                "可真正难的工作，比如判断、协调、兜底和承担后果，恰恰最难被看板捕捉。能被统计的，不一定重要；重要的，往往最难统计。"
            ),
        },
        {
            "heading": "三、请病假之后，你连“低绩效”都很难证明不是自己",
            "quote": "受保护休假或残障状态，会让相关分数天然难以积累。",
            "comment": (
                "这才是算法管理最冷的一面：它不需要公开歧视你，只要把你放进一个不适合你的统计周期，你就会自动变成“数据不足”。"
                "照顾家人、身体不适、换岗适应、做长期项目，这些现实都可能让短期指标变差；而系统不问你为什么，只会把空白折算成风险。"
                "系统看见的是你的缺勤，生活承担的却是你缺勤的原因。"
            ),
        },
        {
            "heading": "四、真正的效率革命，是取消申诉对象",
            "quote": "企业把 AI 用于绩效、晋升和薪酬决策后，员工更容易感到疏离。",
            "comment": (
                "因为你以前至少知道该去找谁：主管、HR、老板。现在大家都说“系统算出来的”，你连反驳的对象都找不到。"
                "算法最省钱的地方，不是替公司完成了多少工作，而是把责任拆散成数据、模型、流程和权限，最后没有一个人承认那是自己的决定。"
                "这不是 AI 接管管理，这是管理层把责任外包给了评分表。"
            ),
        },
    ],
    "judge_body": (
        "这篇原文真正值得追问的，不是“AI 到底有没有亲自裁员”，而是公司为什么愿意把裁员名单、活动数据和绩效排名，"
        "交给一个员工看不见、也很难申诉的系统。原文里的关键矛盾是：企业一边把算法包装成客观工具，一边不公开指标、权重和最终责任人。"
        "于是 AI 成了新闻里的新主角，管理层却从叙事现场退了出去。说到底，这不是机器替老板做决定，"
        "而是老板借机器把决定说得像没有人做过。"
    ),
    "source_label": "来源：Fortune China、AP 关于 Meta 员工指控 AI 辅助裁员的报道；相关研究：CUHK Business School。",
    "footer": "本文为“毒舌职场真相官”专栏评论，事实部分以公开报道为准，观点部分为评论。",
}


def main():
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    html = build_rich_html(ARTICLE, issue_no=31)
    html_path = OUT_DIR / "真相官-AI不会先裁掉你它会先把你打成一个分数-公众号-微信版.html"
    json_path = OUT_DIR / "article.json"
    html_path.write_text(html, encoding="utf-8")
    json_path.write_text(json.dumps(ARTICLE, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"HTML: {html_path}")
    print(f"JSON: {json_path}")
    print(f"TITLE: {ARTICLE['title']}")
    print(f"BODY_CHARS: {len(html)}")


if __name__ == "__main__":
    main()
