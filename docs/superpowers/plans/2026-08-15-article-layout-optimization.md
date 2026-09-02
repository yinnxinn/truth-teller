# 公众号文章版式与内容优化 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 生成不展示日期、金句更突出、配图适量且结尾结构清晰的公众号文章。

**Architecture:** 保留现有文章数据驱动流程，重写富文本渲染器的中文模板，并在单篇文章数据中显式提供 highlights、images、judge 和 title_options。生成脚本只负责组装数据、调用渲染器和写出 UTF-8 文件。

**Tech Stack:** Python 3、UTF-8 JSON/HTML、现有 `gen_wechat_rich.py` 渲染器、现有图片生成脚本。

## Global Constraints

- 日期只用于归档，不渲染到正文。
- 图片最多 3 张：1 张主视觉、最多 2 张插图。
- 公众号正文使用兼容的内联样式。
- 不执行发表动作，只生成并保存草稿素材。

### Task 1: 重写富文本渲染模板

**Files:**
- Modify: `D:/wechat/skill/scripts/gen_wechat_rich.py`

- [ ] 将模板中的所有中文字符串改为正确 UTF-8 文本。
- [ ] 删除作者后的日期渲染，仅保留作者名。
- [ ] 增加 `highlights` 金句卡片渲染。
- [ ] 将图片渲染限制为数据中的前 3 张。
- [ ] 增加独立的“最后的判词”和“下期标题备选”模块。

### Task 2: 重写单篇文章数据与生成脚本

**Files:**
- Modify: `D:/wechat/app/generate_next_article.py`

- [ ] 使用正确 UTF-8 中文重写标题、导语、章节和结尾。
- [ ] 为 4 个章节增加 2 条金句，共 8 条。
- [ ] 只配置 3 张图片，并为每张图片提供 caption。
- [ ] 将日期保留在 JSON 内部字段，但不让渲染器展示。
- [ ] 配置 3 个“下期标题备选”。

### Task 3: 生成图片与新版稿件

**Files:**
- Create/modify: `D:/wechat/content/drafts/2026-08-15-ai评分裁员/`
- Create/modify: `D:/wechat/assets/images/`

- [ ] 使用现有图片脚本生成 3 张与文章主题一致的图片。
- [ ] 运行生成器写出 HTML 与 JSON。
- [ ] 用 Python UTF-8 读取 JSON 和 HTML，验证标题、金句数量、图片数量及无日期展示。
- [ ] 仅更新公众号草稿，不点击“发表”。

### Task 4: 回归核验

- [ ] 运行 `python -m py_compile D:/wechat/app/generate_next_article.py D:/wechat/skill/scripts/gen_wechat_rich.py`。
- [ ] 解析 `article.json`，确认 4 个章节、至少 8 条金句、3 张图片。
- [ ] 检查 HTML 中存在 `最后的判词`、`下期标题备选` 和图片标签。
