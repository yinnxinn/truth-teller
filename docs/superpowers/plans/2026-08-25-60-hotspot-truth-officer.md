# 60 篇热点真相官内容生产 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 研究、生成、验证并保存 60 篇带图的真相官微信公众号草稿，不自动发表。

**Architecture:** 将工作拆成“选题与来源台账”“本地文章工厂”“图片资产”“CDP 草稿注入”“回读验收”五个独立阶段。manifest 是唯一输入合同：每个条目指定标题、摘要、作者、HTML、封面、两张正文图片与来源链接。

**Tech Stack:** Node.js、微信公众号 Chrome CDP、Web 搜索、ImageGen、内联微信 HTML、PowerShell 验证。

## Global Constraints

- 成品为 10 篇五源交叉核验深度篇和 50 篇单点热点解读篇。
- 每篇可见正文至少 1000 个中文字符、标题唯一、无生成日期元信息。
- 每篇一张封面图和一张正文中段图；图片为小于 1MB 的抽象概念插画。
- 平台文章仅作为高讨论样本；事实主张必须用研究、官方数据或权威媒体校验。
- 仅保存草稿，不点击发表。
- 所有写入公众号动作必须串行；保存后重新打开草稿验证正文、图片和封面。

---

### Task 1: 建立选题与来源台账

**Files:**
- Create: `D:/wechat/content/drafts/2026-08-25-hotspot-60/sources.json`
- Create: `D:/wechat/content/drafts/2026-08-25-hotspot-60/editorial_matrix.json`

**Interfaces:**
- Produces: 10 个主题，每主题 5 个经核验来源和 6 个文章切口。
- Consumes: 公开研究、官方数据、权威媒体以及公众号/头条/行业平台样本。

- [ ] **Step 1: 搜索并记录来源**

  每个主题记录 `url`、`publisher`、`published_or_accessed`、`claim`、`evidence_level` 和 `use`。至少三条为一手或权威来源。

- [ ] **Step 2: 验证台账覆盖**

  Run: PowerShell 读取 `sources.json`，验证 10 个主题、每主题至少 5 个来源、每主题至少 3 个 `primary_or_authoritative`。

  Expected: `PASS: 10 topics with source coverage.`

### Task 2: 生成 60 篇微信 HTML 与 manifest

**Files:**
- Create: `D:/wechat/app/generate_hotspot_60_series.mjs`
- Create: `D:/wechat/content/drafts/2026-08-25-hotspot-60/manifest.json`
- Create: `D:/wechat/content/drafts/2026-08-25-hotspot-60/*-微信版.html`
- Test: `D:/wechat/app/test_generate_hotspot_60_series.ps1`

**Interfaces:**
- Consumes: `editorial_matrix.json` 和图片路径。
- Produces: 60 项 manifest；每项包含 `title`、`digest`、`author`、`body_file`、`cover_file`、`inline_images`、`source_url`。

- [ ] **Step 1: 写失败测试**

  测试要求恰好 60 篇、每篇去标签正文不少于 1000 字、标题无重复、每篇恰有两个图片标记且有来源链接和判词。

- [ ] **Step 2: 运行失败测试**

  Run: `powershell -ExecutionPolicy Bypass -File D:/wechat/app/test_generate_hotspot_60_series.ps1`

  Expected: 因生成器或 manifest 缺失失败。

- [ ] **Step 3: 实现文章生成器**

  使用固定的微信内联 HTML 结构，生成一篇深度篇和五篇单点篇/主题；引用必须标注“摘录”或“意译”，并保留来源链接。

- [ ] **Step 4: 运行通过测试**

  Run: `powershell -ExecutionPolicy Bypass -File D:/wechat/app/test_generate_hotspot_60_series.ps1`

  Expected: `PASS: 60 complete article manifests.`

### Task 3: 生成并压缩图片资产

**Files:**
- Create: `D:/wechat/content/drafts/2026-08-25-hotspot-60/images/*.jpg`

**Interfaces:**
- Consumes: `editorial_matrix.json` 的主题视觉说明。
- Produces: 每篇封面和正文图，映射到 manifest 的 `inline_images`。

- [ ] **Step 1: 生成主题概念插画**

  为每个主题生成可复用但不重复的封面与正文概念图，不含文字、真实人物或新闻现场。

- [ ] **Step 2: 验证图片预算**

  Run: PowerShell 验证 manifest 所有图片存在、每张小于 1MB、每篇包含封面和正文图。

  Expected: `PASS: 60 articles have compliant image assets.`

### Task 4: 串行保存草稿并回读

**Files:**
- Modify: `D:/wechat/app/create_hotspot_draft_cdp.mjs` only if a verified injector defect is found.
- Create: `D:/wechat/content/drafts/2026-08-25-hotspot-60/upload_results.json`

**Interfaces:**
- Consumes: `manifest.json`。
- Produces: 每一篇的 `appmsgid`、保存时正文长度与回读验证结果。

- [ ] **Step 1: 检查登录会话**

  Run: `Invoke-WebRequest http://127.0.0.1:9222/json`

  Expected: 微信公众号页面 URL 含有效 `token=`。

- [ ] **Step 2: 串行注入**

  对 manifest 索引 0 至 59 依次运行 `create_hotspot_draft_cdp.mjs`，每次记录 appmsgid，不并行操作同一个编辑器。

- [ ] **Step 3: 串行回读**

  使用 `verify_saved_draft_cdp.mjs` 打开每一个 appmsgid，验证标题匹配、正文至少 1000 字、封面存在、至少两张正文图片。

- [ ] **Step 4: 汇总验收**

  Run: PowerShell 检查 `upload_results.json` 中 60 条记录均为 `ok: true`。

  Expected: `PASS: 60 verified WeChat drafts.`

### Task 5: 交付

**Files:**
- Create: `D:/wechat/content/drafts/2026-08-25-hotspot-60/README.md`

- [ ] **Step 1: 写交付清单**

  列出 60 个标题、主题、草稿编号、正文长度、图片状态与本地目录。

- [ ] **Step 2: 最终状态**

  明确告知用户草稿已保存、未发表，并列出可能需要人工检查的项目。
