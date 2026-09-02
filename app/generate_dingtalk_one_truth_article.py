#!/usr/bin/env python3
"""Generate a Truth Teller WeChat draft for the DingTalk ONE gist."""

import base64
import io
import json
import sys
from pathlib import Path

from PIL import Image

ROOT = Path("D:/wechat")
OUT_DIR = ROOT / "content" / "drafts" / "2026-08-16-dingtalk-one"
IMG_DIR = OUT_DIR / "images"
MANIFEST = OUT_DIR / "manifest.json"
sys.path.insert(0, str(ROOT / "skill" / "scripts"))
from gen_wechat_rich import build_rich_html  # noqa: E402

COVER_SRC = Path(
    r"C:\Users\www19\.codex\generated_images\01a005f0-8ebb-7681-9685-387e99e6c0b7\call_4VU49vG6vZxHTC4zTFjFrxve.png"
)
BODY_SRC = Path(
    r"C:\Users\www19\.codex\generated_images\01a005f0-8ebb-7681-9685-387e99e6c0b7\call_W0zzICNbUNkmvBtzK6RHpBoD.png"
)


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


ARTICLE_V1 = {
    "issue": 37,
    "title": "钉钉ONE刷屏：AI秘书的尽头，为什么总是老板的监工？",
    "slug": "dingtalk-one-boss-view",
    "accent": "#296cd0",
    "template": "cool",
    "author": "毒舌职场真相官",
    "lead": (
        "这篇《置身钉内》真正厉害的地方，不是爆料，而是把一个大厂 AI 项目从理想到收缩的过程，写成了职场人的共同病历。"
        "\n\n它讲的是钉钉 ONE，但刺痛的是所有人：为什么公司口中的“效率”，最后常常变成更精准地找到你、提醒你、催促你、追责你。"
        "\n\n所以这篇不做流水账复述，只抓原文里最锋利的几句话，往下拆一层：ONE 到底死在哪里？AI 办公又为什么总容易从秘书变成监工？"
    ),
    "verdict": (
        "ONE 的悲剧不是 AI 不够强，而是它想做员工的秘书，却长在老板的通讯录里。"
        "员工想减负，组织想闭环，老板想确定；三种欲望挤进一个产品，最后长出来的当然不是秘书，而是穿西装的催债人。"
    ),
    "sections": [
        {
            "heading": "一、它为什么会爆：大厂人看见了自己",
            "quote": "原文说：“没有脚的鸟。”",
            "comment": (
                "这个比喻准在两个字：不落。很多大厂项目不是没飞起来，而是一直飞在战略、发布会、复盘和口径里，就是落不到真实用户身上。"
                "\n\n所以读者不是在围观钉钉，而是在照见自己的公司：流程都对，动作都满，会议都开，最后事情还是偏了。"
                "\n\n真相官判一句：职场最窒息的失败，不是没人努力，而是所有人都很努力地把一件事做歪。"
            ),
        },
        {
            "heading": "二、钉钉最难改的，是成功留下的身体记忆",
            "quote": "原文说：“强触达”“替组织争取确定性”。",
            "comment": (
                "钉钉早年的胜利，本来就不是站在员工这边，而是站在发信人、管理者、组织确定性这一边。"
                "\n\n这套能力太成功，所以它后来做 AI，也很难突然变成温柔助理。产品会本能地问：谁没看？谁没回？谁没做？谁拖了？"
                "\n\n失败会留下伤口，成功会留下手感。ONE 的尴尬，不是不会 AI，而是太会钉钉。"
            ),
        },
        {
            "heading": "三、“事找人”先进，也危险",
            "quote": "原文说：“让人找事变成事找人。”",
            "comment": (
                "这句话适合发布会，也适合让打工人后背发凉。问题不在“找”，而在谁有权定义“事”。"
                "\n\n如果是你关心的事来找你，叫效率；如果是老板关心的事来找你，叫催命。"
                "\n\n办公软件里的信息不是中性的。待办、已读、纪要、提醒，站在员工侧是辅助，站在组织侧就是证据链。AI 越主动，责任越没有缝隙。"
            ),
        },
        {
            "heading": "四、产品最怕的不是没目标，是目标太多",
            "quote": "原文说：“贪心而焦虑。”",
            "comment": (
                "这四个字比骂人狠。ONE 身上背的东西太多：AI 原生、无招回归、发布会、客户信心、市场故事、内部士气。"
                "\n\n每个诉求单独看都合理，叠在一起，产品就从工具变成祭品。"
                "\n\n工具解决问题，祭品安抚焦虑。用户不是被忘了，用户是被老板、战略、KPI 和传播一起挤没了。"
            ),
        },
        {
            "heading": "五、context 不是资料，是权力地图",
            "quote": "原文说：“缺少 context”“旧系统的技术债”。",
            "comment": (
                "AI 圈爱讲上下文，但在办公软件里，上下文不是偏好记录，而是组织架构、审批链、群聊关系、已读未读、任务归属。"
                "\n\n这些不是资料，是权力地图。AI 拿到它们以后，不只是更懂你，也更懂谁能催你、谁能评你、谁能让你负责。"
                "\n\n模型可以装中立，权限系统不会。"
            ),
        },
        {
            "heading": "六、“工作信息流”的另一面，是责任信息流",
            "quote": "原文说：“以 Agent 驱动的工作信息流。”",
            "comment": (
                "这句话听起来很美：AI 帮你整理消息、会议、文档、待办。"
                "\n\n但信息流向哪里，决定它是助手还是监工。流向你，是减负；流向管理者，是仪表盘。"
                "\n\n同一份会议总结，对员工是省事，对组织是留痕；同一个待办提醒，对员工是帮助，对上级是追踪。所谓智能，有时只是让权力少走几步路。"
            ),
        },
        {
            "heading": "七、发布会会把产品逼成表演型人格",
            "quote": "原文写到：“8月25日发布会首次公开。”",
            "comment": (
                "大厂发布会不是时间点，是一台反向塑造产品的机器。"
                "\n\n一旦发布会定了，产品就不再只按用户验证生长，而要按舞台叙事冲刺：能不能截图，能不能讲清楚，能不能成为亮点。"
                "\n\n于是还没长稳的体验，先被穿上西装推上台。掌声过去后，真实用户才开始审判。"
            ),
        },
        {
            "heading": "八、AI 不是进白纸，而是进旧城",
            "quote": "原文说：“难以改造的旧城。”",
            "comment": (
                "这个判断很深。AI 项目看上去是新东西，实际是在旧城里修地铁。下面全是旧系统、旧权限、旧客户、旧流程、旧成功经验。"
                "\n\n所以很多大厂 AI 项目不是输给模型，而是输给历史。模型能升级，组织惯性很难升级。"
                "\n\n如果旧路本来就是为管理者修的，AI 这辆新车开进去，大概率还是会沿着老路跑。"
            ),
        },
        {
            "heading": "九、所谓 AI 原生，最怕只是旧管理换皮",
            "quote": "原文说：“号称 AI 原生。”",
            "comment": (
                "真正的 AI 原生，应该先重看用户怎么工作，再判断 AI 怎么介入。"
                "\n\n伪 AI 原生，是公司先需要一个 AI 故事，再把旧流程塞进新入口。"
                "\n\n前者解决痛点，后者美化焦虑。ONE 这篇文章的后劲就在这里：它不是在说钉钉一个产品，而是在说很多公司都怕错过 AI，于是更容易错过人。"
            ),
        },
        {
            "heading": "十、打工人真正该带走的，是警惕",
            "quote": "原文说：“从热烈理想走向收缩。”",
            "comment": (
                "这不是一个产品从热闹到冷清的故事，而是一个理想被组织慢慢改写的故事。"
                "\n\n未来你遇到的 AI 办公产品，不一定先替你减负，可能先替公司量化你。它会整理你的任务、追踪你的响应、标记你的遗漏，再告诉你这是效率。"
                "\n\n所以别只学会用 AI，也要学会看 AI 背后站着谁。工具不可怕，可怕的是你以为它在帮你工作，它却在帮组织重新定义你。"
            ),
        },
    ],
    "judge_body": (
        "《置身钉内》的价值，不在于给 ONE 判死刑，而在于它把一具大厂 AI 项目的骨架剖开了。"
        "\n\nONE 最值得警惕的地方，是它暴露了 AI 办公的底层矛盾：员工要减负，组织要闭环，老板要确定性。"
        "当三者冲突时，系统通常会站回付钱的人那边。"
        "\n\n所以 ONE 的墓志铭可以很短：它想让事找到人，却忘了在公司里，大多数事本来就是来找人算账的。"
    ),
    "source_label": "来源：GitHub Gist《置身钉内》，作者滕雅辛（幽素）。本文为评论解读，短引原文句子用于分析。",
    "footer": "本文由“毒舌职场真相官”深度评论，不代表原作者立场。",
}


# V2 follows the source's causal chain instead of repeating a single conclusion.
ARTICLE = {
    "issue": 37,
    "title": "钉钉ONE刷屏：AI秘书的尽头，为什么总是老板的监工？",
    "slug": "dingtalk-one-boss-view",
    "accent": "#296cd0",
    "template": "cool",
    "author": "毒舌职场真相官",
    "lead": (
        "《置身钉内》之所以能炸，不是因为它写了一款产品的兴衰，而是因为它把大厂做 AI 时最难看的那层皮，撕得很具体：理想、历史、商业和老板的焦虑，最后一起落在了一个产品经理的待办里。"
        "\n\n原文讲的是钉钉 ONE；但真正值得读的，不是谁做错了某个功能，而是一条更残酷的因果链：一个产品先继承了旧业务最成功的权力逻辑，又要同时讨好员工、管理者、市场与发布会，它迟早会变形。"
        "\n\n下面不替原文做摘要，只沿着它已经给出的证据，把这条链拆开。每一段先回到原文，再说真相官看到的另一面。"
    ),
    "verdict": (
        "ONE 的问题从来不只是 AI 不够强。它想做员工的秘书，却继承了替组织追责的本能；"
        "当“减负”和“确定性”挤进同一套产品，最后最容易长出来的，不是助手，而是更聪明的催办系统。"
    ),
    "sections": [
        {
            "heading": "一、为什么一只“不落地的鸟”，会成为整篇文章的暗喻",
            "quote": "没有脚的鸟｜连续飞行三百多天不落地",
            "comment": (
                "原文用钉三多——一只几乎不落地的雨燕——开场，表面写企业吉祥物，实际已经把 ONE 的命运摆在桌上：飞得很久，不等于知道自己要落在哪里。"
                "\n\n很多大厂项目不是没有资源、没有人、没有热情，恰恰相反，它们的会议、版本、汇报、发布节奏都很饱满。真正稀缺的是着陆点：一个能被真实用户反复使用、而不是被内部叙事反复解释的场景。"
                "\n\n所以这篇文章击中的，不只是做钉钉的人。所有在战略、复盘、口径之间持续盘旋过的人，都知道：最窒息的失败，不是没人努力，而是所有人都很努力地把一件事做歪。"
            ),
        },
        {
            "heading": "二、最难推翻的，不是旧代码，是成功留下的身体记忆",
            "quote": "站在发信人一侧｜替组织争取确定性｜用强触达把事情往前推",
            "comment": (
                "这几句是原文最关键的底牌。钉钉的早期胜利，本来就建立在“让发信人放心”上：消息有没有看见，交代的事有没有往前走，组织能不能少一点失控。"
                "\n\n这并不天然邪恶，它甚至是企业协作软件最值钱的能力。但成功会留下手感。一个靠强触达、已读和催办赢过的产品，后来做 AI 时，很难突然长成只替员工挡事的温柔秘书。它会本能地追问：谁没回、谁没做、谁卡住了。"
                "\n\n原文说“失败会留下伤口，成功会留下手感”，这句话比任何归因都准。ONE 的尴尬，不是不会做 AI，而是太会做钉钉。"
            ),
        },
        {
            "heading": "三、“事找人”不是功能口号，而是一道站队题",
            "quote": "让人找事变成事找人｜AI变成老板的监工助手",
            "comment": (
                "“让人找事变成事找人”当然很迷人。消息、会议、文档和待办不再散落，AI 主动把该做的事推到你面前——这在产品演示里叫效率。"
                "\n\n但原文把另一半也写出来了：当同一张卡片能够记录阅读、排优先级、替上级汇总进度时，用户最直接的感受会变成“AI变成老板的监工助手”。问题从来不在“找”，而在谁有权定义什么是重要的事。"
                "\n\n你关心的事来找你，是助手；老板关心的事来找你，是催命。待办、已读、纪要、提醒从不是中性的：站在员工一侧是辅助，站在组织一侧就是证据链。"
            ),
        },
        {
            "heading": "四、它不是没定位，而是被两套定位同时撕扯",
            "quote": "优先服务员工｜优先服务老板｜贪心而焦虑",
            "comment": (
                "原文没有简单地把问题说成“老板坏、员工惨”。它把 B 端产品最难解的现实摆得很清楚：使用者希望少被打扰，付费决策者希望信息集中、进度可见、风险可控。两边都不是假需求。"
                "\n\n真正的灾难发生在产品不愿取舍时。ONE 既想做面向全员的效率工具，又想承担管理者的机要秘书角色；既要讲 AI 原生，又要接住旧钉钉的商业逻辑；既要做长期入口，又要迅速拿出能讲的故事。"
                "\n\n这就是原文所说的“贪心而焦虑”。工具本该解决一个明确问题，祭品才需要同时安抚老板、战略、KPI、市场和内部士气。用户不是被忘了，是被这些正确但互相打架的目标一起挤没了。"
            ),
        },
        {
            "heading": "五、AI 进的不是白纸，是一座有权限和债务的旧城",
            "quote": "缺少context｜旧系统的技术债｜难以改造的旧城",
            "comment": (
                "这一段是文章真正的技术深度。AI 产品最喜欢把自己说成“原生”，仿佛接上模型，一切旧规则都会自动失效。原文提醒得很冷静：钉钉不是白纸，它有权限、端侧差异、多组织、客户定制和多年的技术债。"
                "\n\n而在办公软件里，context 也不是几个用户偏好。它是组织架构、审批链、群聊关系、已读记录、任务归属；说白了，是一张权力地图。AI 拿到这些信息后，不只会更懂你，也会更懂谁能催你、谁能评你、谁能让你负责。"
                "\n\n模型可以装中立，权限系统不会。AI 不是开进白纸，而是在旧城修地铁；地底下每一根管线，都决定它最后把便利送给谁、把压力推给谁。"
            ),
        },
        {
            "heading": "六、发布会不是起点，倒排一切时它会变成终点",
            "quote": "发布会倒排一切｜发布会前置、舆论先行｜从根上，看错了用户",
            "comment": (
                "原文最有戏剧张力的部分，不在某个功能翻车，而在项目节奏被发布会反向塑造：日期、规格、战略口径先固定，需求、设计、研发、测试再为舞台让路。"
                "\n\n这时产品不再按用户验证生长，而要按演示叙事冲刺：能不能讲清楚，能不能截图，能不能成为亮点。还没长稳的体验先穿上西装上台，真实用户只能在掌声之后才有资格发言。"
                "\n\n所以原文最后那句“从根上，看错了用户”不是一句复盘话术，而是整条链的回声。当一个项目先敬畏发布会、KPI 和上级预期，再谈敏捷和用户，所谓创新往往只是把组织焦虑做得更精致。"
            ),
        },
    ],
    "judge_body": (
        "《置身钉内》的价值，不是替 ONE 写一份失败判决书，而是把一款大厂 AI 产品如何被自己的基因、商业模式、技术旧城与组织节奏共同塑形，完整摊在了桌上。"
        "\n\n它提醒每个做 AI 的人：员工要减负，组织要闭环，管理者要确定性，三者都是真的；但一套产品不可能靠更聪明的模型，把所有冲突自动抹平。"
        "\n\n真相官最后判一句：ONE 想让事找到人，却忘了在公司里，很多事之所以急着找到你，不是为了帮你做完，而是为了确认最后该谁负责。"
    ),
    "source_label": "来源：GitHub Gist《置身钉内》，作者滕雅辛（幽素）。本文为评论解读，短引原文句子用于分析。",
    "footer": "本文由“毒舌职场真相官”深度评论，不代表原作者立场。",
}


def render(article, body_img: Path):
    body_data = body_img.read_bytes()
    article_for_template = dict(article)
    article_for_template["images"] = [
        {
            "filename": "37-dingtalk-one-body.jpg",
            "caption": "AI 办公最怕的不是不聪明，而是太懂组织权力。",
            "mime": "image/jpeg",
            "b64": base64.b64encode(body_data).decode("ascii"),
        }
    ]
    return build_rich_html(article_for_template, issue_no=article["issue"])


def main():
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    IMG_DIR.mkdir(parents=True, exist_ok=True)
    cover = IMG_DIR / "37-dingtalk-one-cover.jpg"
    body_img = IMG_DIR / "37-dingtalk-one-body.jpg"
    cover_info = compress(COVER_SRC, cover)
    body_info = compress(BODY_SRC, body_img)
    html = render(ARTICLE, body_img)
    html_path = OUT_DIR / "37-dingtalk-one-boss-view.html"
    json_path = OUT_DIR / "37-dingtalk-one-boss-view.json"
    html_path.write_text(html, encoding="utf-8")
    json_path.write_text(json.dumps(ARTICLE, ensure_ascii=False, indent=2), encoding="utf-8")
    manifest = [
        {
            "no": ARTICLE["issue"],
            "title": ARTICLE["title"],
            "slug": ARTICLE["slug"],
            "body_file": str(html_path),
            "cover_file": str(cover),
            "body_chars": len(html),
            "cover_bytes": cover_info["bytes"],
            "body_image_bytes": [body_info["bytes"]],
        }
    ]
    MANIFEST.write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps({"ok": True, "out": str(OUT_DIR), "manifest": str(MANIFEST), "items": manifest}, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
