# 离婚率真相官文章 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 产出并保存一篇基于近期官方婚姻统计的真相官公众号草稿。

**Architecture:** 将权威统计整理为结构化事实，再填入既有的微信安全 HTML 模板；使用 CDP 脚本注入标题、正文、摘要和封面，随后独立回读草稿。

**Tech Stack:** JSON、内联 HTML、JPEG、Node.js CDP、微信公众号后台。

## Global Constraints

- 正文只针对统计口径与媒体叙事，不攻击个人或群体。
- 全文不显示生成日期；保留原始统计来源链接与版权说明。
- 只保存草稿；公开发表前必须取得最终动作确认。

---

### Task 1: 事实与正文

**Files:**
- Create: `D:\wechat\content\drafts\2026-08-23-divorce-rate\article.json`
- Create: `D:\wechat\content\drafts\2026-08-23-divorce-rate\离婚率真相官-微信版.html`

- [ ] 写入经过来源交叉核对的统计事实。
- [ ] 写出 700–900 字真相官正文，至少三组原文摘录（意译）与点评，加入判词与来源。
- [ ] 检查正文没有日期、占位符或将不同统计口径直接相减的表述。

### Task 2: 配图与微信 HTML

**Files:**
- Create: `D:\wechat\content\drafts\2026-08-23-divorce-rate\images\cover.jpg`
- Create: `D:\wechat\content\drafts\2026-08-23-divorce-rate\images\body.jpg`
- Create: `D:\wechat\content\drafts\2026-08-23-divorce-rate\manifest.json`

- [ ] 生成抽象讽刺插画，不使用真实人物肖像或文字图。
- [ ] 将图片处理为适合手机端的 JPEG，并在 HTML 中使用图片占位标记。
- [ ] 校验 HTML 为全内联样式，正文与图片路径存在。

### Task 3: 草稿注入与核验

**Files:**
- Uses: `D:\wechat\app\create_hotspot_draft_cdp.mjs`
- Uses: `D:\wechat\app\verify_saved_draft_cdp.mjs`

- [ ] 用 manifest 注入标题、摘要、正文和封面并保存草稿。
- [ ] 重新打开对应草稿，确认标题、至少 500 字可见正文、封面与正文图片存在。
- [ ] 告知用户草稿已准备好，索取发表前的最终确认。
