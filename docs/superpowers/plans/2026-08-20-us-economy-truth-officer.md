# 美国经济真相官草稿批次 Implementation Plan

> **For agentic workers:** Execute this plan inline, keeping browser mutations strictly serial and verifying every saved draft by reopening it.

**Goal:** 用十个真实来源制作十篇 500–800 字的美国经济真相官图文，并仅保存到公众号草稿箱。

**Architecture:** 先建立来源台账，台账中的每一项包含 URL、日期、可核验论点和文章主题。每篇文章从对应台账项生成独立微信兼容 HTML、两张抽象概念图和草稿记录；CDP 创建草稿后，验证脚本重新打开页面读取持久化状态。

**Tech Stack:** Web 搜索与原始来源页面、ImageGen、微信内联 HTML、Node.js CDP 脚本、公众号后台已登录的专用 Chrome。

## Global Constraints

- 仅使用真实、近期、可访问的美国经济报道或分析；避免选举和党派动员。
- 每篇正文可见中文字符数为 500–800，标题不计入。
- 每篇包含：真相翻译官、至少 3 组“原文要点／点评”、最后的判词、来源链接与版权说明。
- 每篇 1 张封面、1 张正文抽象概念图；不含文字海报、真实人物肖像或新闻现场。
- HTML 仅使用微信兼容的内联样式；不含作者备注、日期或占位符。
- 只保存草稿；绝不发表。

---

### Task 1: 建立十条来源台账

**Files:**
- Create: `D:/wechat/content/drafts/2026-08-20-us-economy/sources.json`

**Produces:** 每项包含 `id`、`topic`、`source_title`、`source_url`、`published_at`、`claims`（至少三条准确摘录或转述）、`template`。

- [ ] 检索并优先选择 Reuters、AP、WSJ、Bloomberg、官方统计机构、公司财报等可核验来源。
- [ ] 对每项检查网页标题、发布日期、关键论点与 URL 一致；剔除重复议题与无法验证的数字。
- [ ] 写入 JSON 台账，并确认十个 URL 均为非空 HTTPS 链接。

### Task 2: 生成十篇真相官正文和微信 HTML

**Files:**
- Create: `D:/wechat/content/drafts/2026-08-20-us-economy/01-*.html` 至 `10-*.html`
- Create: `D:/wechat/content/drafts/2026-08-20-us-economy/manifest.json`

**Consumes:** `sources.json` 中每条来源的三个可核验论点。

**Produces:** 每篇 HTML 与 manifest 项：标题、摘要、正文文件、封面文件、正文图片文件、来源 URL。

- [ ] 按台账逐篇写 500–800 字正文，使用三组“原文要点／点评”并将讽刺落在制度、资本和组织逻辑上。
- [ ] 使用经典、暗黑、杂志模板按主题轮换；把来源链接与版权说明放到末尾。
- [ ] 用脚本统计各 HTML 的纯文本字符数，拒绝小于 500 或大于 800 的成品。
- [ ] 检查无 `{{`、`}}`、调试文字、生成日期或未替换图片标记。

### Task 3: 生成并压缩配图

**Files:**
- Create: `D:/wechat/content/drafts/2026-08-20-us-economy/images/01-cover.jpg` 至 `10-cover.jpg`
- Create: `D:/wechat/content/drafts/2026-08-20-us-economy/images/01-inline.jpg` 至 `10-inline.jpg`

**Consumes:** 每篇文章的主题、模板色彩与判词。

**Produces:** 20 张无文字的抽象讽刺插画，单张小于 1 MB。

- [ ] 以手机窄栏、低饱和扁平概念插画为共同风格生成封面和正文图。
- [ ] 将每张图片转换为 JPEG 并压缩至 1 MB 以下。
- [ ] 替换 HTML 内的图片占位为 data URI，确认每篇有两张实际图片。

### Task 4: 串行创建并保存草稿

**Files:**
- Modify: `D:/wechat/content/drafts/2026-08-20-us-economy/manifest.json`（记录 `appmsgid`）
- Create: `D:/wechat/content/drafts/2026-08-20-us-economy/verification.json`

**Consumes:** 已通过文字与图片检查的 manifest 项。

**Produces:** 十个公众号草稿及逐篇验收结果。

- [ ] 每次仅创建一篇新草稿，填入标题、摘要、封面和 HTML 正文，保存为草稿。
- [ ] 保存后使用 `D:/wechat/app/verify_saved_draft_cdp.mjs` 重新打开该 `appmsgid`。
- [ ] 核对标题、正文字符数、三组点评、判词、来源链接、封面与正文图片；通过后记录验收结果才继续下一篇。
- [ ] 出现空正文、串稿或验收不合格时，保留异常草稿作为记录，单独新建正确版本，不覆盖或删除旧稿。

### Task 5: 汇总交付

**Files:**
- Modify: `D:/wechat/content/drafts/2026-08-20-us-economy/verification.json`

- [ ] 汇总每篇的来源、标题、模板、字数、草稿 ID、图片大小和验证结果。
- [ ] 明确列出任何未通过项；不把未重开验收的草稿计入完成。
- [ ] 通知用户草稿已经保存，提醒其审核后再明确授权发表。
