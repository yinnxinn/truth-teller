# Workplace Truth Teller 开源整合设计

## 目标

把已经公开的微信公众号自动化仓库整理成一个更容易理解、安装和维护的开源项目。项目中文品牌继续使用“毒舌职场真相官”，GitHub 仓库改名为更短的 `workplace-truth-teller`，Codex Skill 的稳定调用名仍为 `toxic-corporate-truth-teller`。

## 整合原则

- 保留现有 `app/`、`content/`、`assets/`、`docs/` 和全部 Git 历史，不覆盖远端 `master`。
- 将已通过 23 项测试和官方校验的 Skill 版本同步到现有 `skill/` 目录。
- 稳定核心是素材核实、文章生成、配图降级和微信安全版 HTML。
- `app/` 中依赖已登录浏览器、CDP 和微信公众号页面结构的草稿操作明确标为实验能力。
- 自动化最多保存草稿；无法验证保存状态时不得宣称成功，不自动发表。
- 不提交 Cookie、浏览器会话、登录截图、用户草稿或硬编码密钥。

## 仓库结构

```text
workplace-truth-teller/
├── README.md                 项目总入口与安装说明
├── LICENSE                   MIT
├── CONTRIBUTING.md           贡献与验证流程
├── skill/                    可独立安装的 Codex Skill
│   ├── SKILL.md
│   ├── agents/openai.yaml
│   ├── assets/
│   ├── scripts/
│   ├── references/
│   ├── examples/
│   └── tests/
├── app/                      实验性的公众号自动化工作区
├── docs/                     设计、维护与迁移说明
└── .github/workflows/        Skill 持续集成
```

## README 设计

README 仅使用中文叙述，开头直接说明项目用途，并将能力分为“稳定核心”和“实验自动化”。安装说明从仓库的 `skill/` 子目录复制到用户的 `.codex/skills/toxic-corporate-truth-teller`，目标目录已存在时停止，不自动覆盖。文档同时提供最短调用、微信安全版 HTML 命令、目录结构、实验环境前提、隐私边界、测试和贡献方式。

## 验证与发布

- Skill 测试在 `skill/tests/` 中运行，并把 `skill/` 视为测试根目录，避免扫描或改写既有 `app/` 数据。
- GitHub Actions 配置 Python 3.12、Node.js 22、pytest 和 PyYAML，运行 Skill 全套测试。
- 发布采用功能分支和拉取请求；CI 通过后合并，不强推远端 `master`。
- 合并完成后把仓库从 `toxic-corporate-truth-teller` 改名为 `workplace-truth-teller`，核对 GitHub 自动重定向、默认分支、MIT 许可证和 CI。

## 验收标准

- 现有应用文件和历史不丢失。
- `skill/` 通过全部仓库测试和官方 Skill 校验。
- 新用户能根据 README 安装并调用 Skill。
- README 不把 CDP 草稿操作描述成无条件可靠的一键发布。
- GitHub 默认分支包含 MIT、贡献指南和成功的 CI。
