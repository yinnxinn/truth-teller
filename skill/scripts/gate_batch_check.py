#!/usr/bin/env python3
"""gate_batch_check.py — 让"门"从口头变成文件与可跑检查。

对一篇已写成 article.json 的草稿(尤其复杂/长文)，做两件事：
1) 落地"批件"到同目录：按需生成 01-选题卡.md / 02-骨架卡.md / 06-来源与认真脸.md，
   让每道门留的是文件而不是口头。
   02 骨架门它不能替你选体裁（那是主笔在你给素材时先做的事），只把现状生成可审的骨架快照。
2) 跑一道硬 lint（替代原来"在心里过"的自审），对硬伤返回文件列表与退出码 1：
   - CJK 乱码残留（锛/鈥 � 等 GBK 替换痕迹）——上回乱码 bug 就能卡在这
   - "quote 原文摘录"疑似塞了内部指令/占位（不以可核实句开头、或含"请/需/我建议"或 <html）
   - 命中风险题材(医药/健康/法律/金融/财报/裁员…)却无"不替代专业建议/来源"兜底词

用法：
  python skill/scripts/gate_batch_check.py --article <draft>/article.json [--batchdir <dir>]

约定：调用方(正文里的角色)更早的两道门——选题与选骨架——的主笔判断不是本工具能代替的；
本工具把"该留的件"生成出来，并把质检做成硬检查。批件默认写在 article.json 所在目录。
"""
import argparse
import json
import re
import sys
from pathlib import Path

# 无论控制台是什么 codepage 都能打印中文/符号（Windows GBK 控制台尤需）
if sys.stdout.encoding and sys.stdout.encoding.lower() not in ("utf-8", "utf8"):
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

RISK_BODYWORDS = [
    "医药", "健康", "疾病", "病毒", "癌症", "法律", "法院", "判决", "上市", "财报",
    "分红", "裁员", "净利", "营收", "利润", "投资", "理财", "收益", "罚款", "工程", "科研",
]
REASSURANCE_HINTS = ["来源", "不替代专业建议", "权威来源", "核验", "公告", "披露", "本文为评论", "作者观点", "推断"]

MOJIBAKE_PATTERNS = re.compile(r"[\uFFFD]|锛|鈥|�|鐪|鍦|鏄")


def _clean(text):
    return re.sub(r"<[^>]+>", "", text or "")


def write_if_absent(path: Path, content: str, label: str) -> bool:
    if path.exists():
        print(f"  批件已存在（保留）：{path.name}")
        return False
    path.write_text(content, encoding="utf-8")
    print(f"  生成批件 -> {path.name}")
    return True


def batch_topic(a):
    """从 lead/verdict 里抓一句当主题摘要。"""
    return (a.get("lead") or a.get("verdict") or a.get("title") or "").strip()


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--article", required=True)
    ap.add_argument("--batchdir", default=None)
    args = ap.parse_args()

    art = json.loads(Path(args.article).read_text(encoding="utf-8-sig"))  # 容忍 Windows 编辑器常见 BOM
    base = Path(args.article).resolve().parent if not args.batchdir else Path(args.batchdir)
    base.mkdir(parents=True, exist_ok=True)

    title = art.get("title", "无标题")
    topic = batch_topic(art)
    sections = art.get("sections", [])
    src_url = art.get("source_url", "")

    # ---------- ① 选题卡（缺则补一张骨架性质的批件） ----------
    write_if_absent(
        base / "01-选题卡.md",
        f"# ① 选题卡（批件）\n\n- 主题：{title}\n- 一段定位：{topic[:160]}\n"
        f"- 核点（可核实数段）：本文含 {len(sections)} 段拆解，各段引的见 ⑥ 来源清单。\n"
        f"- 判定：由主笔在动笔前做；本文件用于留痕“为什么是现在/读者谁/核点够不够”。\n",
        "选题门",
    )

    # ---------- ② 骨架卡（现状快照，评你当初选的体裁结构） ----------
    lines = [f"# ② 骨架卡（批件·现状快照）\n", f"- 标题：{title}\n", f"- 结构：全文 {len(sections)} 个分节。\n"]
    for i, s in enumerate(sections, 1):
        lines.append(f"  {i}. 段落目标（取自 heading）：{_clean(s.get('heading',''))[:70]}")
    lines.append("\n- 体裁定夺与“钩子/收尾”说明属主笔在②的决策；本文件只复盘已落到正文的结构。")
    write_if_absent(base / "02-骨架卡.md", "\n".join(lines), "骨架门")

    # ---------- lint（硬检查） ----------
    hard_issues = []
    joined = json.dumps(art, ensure_ascii=False)

    # (a) 乱码
    if MOJIBAKE_PATTERNS.search(joined):
        hard_issues.append("正文含乱码残留（GBK 替换痕迹），先修编码再交付。")

    # (b) quote 疑似非"可核实原话/来源句"
    for i, s in enumerate(sections, 1):
        q = _clean(s.get("quote", ""))
        if not q:
            continue
        low = q.lower()
        if q.startswith(("请", "需", "我建议")) or "<" in low or "{{" in q:
            hard_issues.append(f"第{i}段 quote 疑似塞了内部指令/占位，不删干净别进成品：{q[:60]}")
        if len(q) < 8:
            hard_issues.append(f"第{i}段 quote 过短，可能是作者自己的话，建议标成‘观点’而非‘原文摘录’：{q[:50]}")

    # (c) 风险题材 + 是否给了免责/来源兜底
    bodytext = _clean(" ".join([str(s.get("comment", "")) for s in sections]) + art.get("lead", ""))
    if any(w in bodytext or w in title for w in ["医药", "健康", "疾病", "癌症", "法律", "法院", "财报", "分红", "上市", "投资", "理财"]):
        if not any(hm in joined for hm in REASSURANCE_HINTS):
            hard_issues.append("涉高风险题材(医药/健康/法律/财报/理财等)但全文缺少【来源/不替代专业建议/非专业意见】类兜底，先补齐再交付。")

    # ---------- ⑥ 来源与认真脸 ----------
    src_lines = [f"# ⑥ 来源与认真脸（批件）\n", f"- 标题：{title}\n", "- 用到的转述口径/来源（报道转述）：\n"]
    for i, s in enumerate(sections, 1):
        q = _clean(s.get("quote", ""))
        src_lines.append(f"  - 拆解 {i} 引用段：{q[:80]}")
    if src_url:
        src_lines.append(f"\n- 来源链接：{src_url}")
    else:
        src_lines.append("\n- ⚠ 无 source_url：涉风险题材请务必补齐来源再交付。")
    src_lines.append("\n- 认真脸（高风险自动补）：本文基于公开报道的二次讨论/评论，不代表专业(投资/法律/医疗)建议；数字按报道口径，以公司正式公告与法定披露为准。")
    write_if_absent(base / "06-来源与认真脸.md", "\n".join(src_lines), "签发门")

    # ---------- report ----------
    print("\n===== gate_batch_check 结果 =====")
    if hard_issues:
        print(f"硬伤 {len(hard_issues)} 处：")
        for h in hard_issues:
            print("  ✗", h)
        return 1
    print("✓ 通过硬 lint（无乱码/无占位/无缺免责），风险兜底到位。")
    return 0


if __name__ == "__main__":
    sys.exit(main())
