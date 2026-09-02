# Workplace Truth Teller 开源整合实施计划

## Task 1：建立整合基线

- 在 `codex/open-source-skill-refresh` 分支运行现有可离线测试并记录结果。
- 添加一个失败测试，要求 `skill/agents/openai.yaml`、`skill/tests/`、根目录 `LICENSE`、`CONTRIBUTING.md` 和 Skill CI 存在。

## Task 2：同步经过验证的 Skill

- 将独立项目中已验证的 `SKILL.md`、`agents/`、`assets/`、`scripts/`、`references/`、`examples/` 和 `tests/` 同步到 `skill/`。
- 调整测试，使 `skill/` 成为根目录，并让 Git 跟踪文件检查只分析 `skill/` 子树。
- 运行 Skill 测试和官方 `quick_validate.py skill`。

## Task 3：更新开源项目入口

- 重写根 `README.md`，覆盖品牌、稳定/实验边界、安装、更新、快速开始、HTML、目录、测试和安全说明。
- 添加 MIT `LICENSE` 和中文 `CONTRIBUTING.md`。
- 添加 `.github/workflows/validate-skill.yml`，配置 Python 3.12 和 Node.js 22，运行 `python -m pytest skill/tests -v`。
- 更新旧文档中的私有仓库、旧绝对路径和过时工具描述。

## Task 4：验证、提交与发布

- 运行 Skill 全套测试、官方校验、JavaScript/Python 语法和 `git diff --check`。
- 检查差异没有删除或重写 `app/`、`content/` 与现有历史文件。
- 提交并推送功能分支，创建拉取请求；等待 CI 通过后合并。
- 把仓库改名为 `workplace-truth-teller`，设置主题标签，验证新旧 URL、默认分支、许可证和 CI。
