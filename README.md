# Workplace Truth Teller

[![验证 Skill](https://github.com/yinnxinn/workplace-truth-teller/actions/workflows/validate-skill.yml/badge.svg)](https://github.com/yinnxinn/workplace-truth-teller/actions/workflows/validate-skill.yml)

中文名：**毒舌职场真相官**。

这是一个面向中文职场内容的 Codex Skill 与微信公众号创作工作区：把公司新闻稿、内部信、财报、职场复盘和流量科普拆成可核实的事实与有边界的评论，再生成适合人工审阅和微信编辑器使用的内容。

## 能做什么

| 能力 | 稳定性 | 说明 |
|---|---|---|
| 素材核实与文章生成 | 稳定核心 | 解构权力、责任、成本和激励关系；不捏造原文。 |
| 微信安全版 HTML | 稳定核心 | 必须由 `skill/scripts/gen_wechat_safe.py` 实际生成。 |
| 配图生成与降级 | 稳定核心 | 有可用生图工具时生成插画；失败时允许无图或占位方案。 |
| 公众号后台保存草稿 | 实验自动化 | 依赖已登录浏览器、CDP、页面结构和用户明确授权，随时可能因页面改版失效。 |
| 自动发表 | 不支持 | 项目不自动点击“发表”；最终发布始终由用户确认。 |

一句话边界：**内容生成是产品，后台自动化是实验。**

项目不自动发布任何文章；保存草稿和正式发表是两个不同权限层级。

## 两种使用方式

### 1. 安装 Codex Skill（推荐）

Skill 的稳定调用名保持为：

```text
$toxic-corporate-truth-teller
```

安装目标是用户目录下的 `~/.codex/skills/toxic-corporate-truth-teller`；Windows 命令会自动换算成对应的用户路径。

先克隆仓库：

```powershell
git clone https://github.com/yinnxinn/workplace-truth-teller.git
```

Windows PowerShell 安装：

```powershell
$repoRoot = (Resolve-Path ".\workplace-truth-teller").Path
$skillsRoot = Join-Path $env:USERPROFILE ".codex\skills"
$target = Join-Path $skillsRoot "toxic-corporate-truth-teller"
if (Test-Path -LiteralPath $target) { throw "目标目录已存在，请先核对或备份现有 Skill：$target" }
New-Item -ItemType Directory -Path $skillsRoot -Force | Out-Null
Copy-Item -LiteralPath (Join-Path $repoRoot "skill") -Destination $target -Recurse
```

macOS/Linux 安装：

```bash
git clone https://github.com/yinnxinn/workplace-truth-teller.git
target="${CODEX_HOME:-$HOME/.codex}/skills/toxic-corporate-truth-teller"
test ! -e "$target" || { echo "目标目录已存在，请先核对或备份：$target"; exit 1; }
mkdir -p "$(dirname "$target")"
cp -R workplace-truth-teller/skill "$target"
```

安装命令发现目标目录已存在时会停止，不会自动覆盖你的本地修改。

### 2. 使用完整工作区

仓库根目录的 `app/` 保留了文章批量生成、HTML 校验和公众号草稿实验脚本。它们适合继续开发和调试，不属于跨环境保证可用的 Skill 核心。

```powershell
python -m pip install -r requirements.txt
python app\run_pipeline.py --check
python app\run_pipeline.py --list
```

涉及公众号后台的脚本可能需要 Windows、已登录的 Chrome、CDP `9222` 端口及当前页面结构。运行前请阅读脚本和[维护说明](docs/skill-maintenance.md)，不要把浏览器配置或登录数据提交到仓库。

## 快速开始

在 Codex 中调用：

```text
$toxic-corporate-truth-teller 解构这份内部通知，保留事实边界，并生成供我审阅的公众号文章与微信安全版 HTML。
```

也可以让 Skill 搜索近期热点，但涉及新闻、政策、医学、法律或财务事实时必须核实来源。文章至少包含：

- 真相翻译官：一句话指出包装后的真实激励。
- 毒舌深拆解：逐条引用原文，再评论组织逻辑。
- 最后的判词：给出讽刺但不人身攻击的结论。
- 原文来源、版权说明；专业题材增加认真提醒。

完整行为说明见 [`skill/SKILL.md`](skill/SKILL.md)，原创示例见 [`skill/examples/README.md`](skill/examples/README.md)。

## 生成微信版 HTML

准备 `article.json` 后，在仓库根目录运行：

```powershell
python skill/scripts/gen_wechat_safe.py --config article.json --out article.html --no-images
```

安全版生成器默认采用更稳妥的内联结构。脚本无法运行时，不要把模型手写的 HTML 称为“微信安全版 HTML”。生成后先在本地打开检查，再复制粘贴到公众号编辑器。

三种内容风格：

- `classic`：通用内部信、职场材料。
- `dark`：重磅组织问题和强冲突话题。
- `magazine`：轻量吐槽、生活方式或科普。

`skill/assets/article_template.html` 为旧版兼容参考，不用于默认安全输出。

## 实验自动化：保存公众号草稿

这项实验功能不是默认流程，也不保证跨环境可用。

只有同时满足以下条件才尝试：

1. 用户明确要求保存草稿，并授权浏览器操作。
2. 公众号后台已登录，且使用的浏览器控制方式能够访问该登录态。
3. 当前页面结构可以识别标题、正文和保存按钮。
4. 已生成并检查正文，不含占位符、调试信息或私密内容。

浏览器不可控、登录失效、页面结构变化或保存状态无法验证时，立即停止，回退到 HTML 手动粘贴。看不到明确成功信号，就不得宣称“已保存到草稿箱”。

## 项目结构

```text
skill/       可独立安装的 Codex Skill、模板、生成器、参考资料和测试
app/         公众号内容与草稿实验自动化脚本
content/     可复现流程使用的源材料；生成草稿默认不入库
assets/      工作区配图资源
docs/        设计、迁移、维护和历史实施计划
tests/       仓库级开源布局测试
```

## 本地验证

需要 Git、Python 3.12、Node.js 22、`pytest` 和 `PyYAML`：

```powershell
python -m pip install pytest pyyaml
python -m pytest skill/tests tests -v
$env:PYTHONUTF8 = "1"
python "$env:USERPROFILE\.codex\skills\.system\skill-creator\scripts\quick_validate.py" skill
git diff --check
```

`quick_validate.py` 来自 Codex 内置 `skill-creator`；没有该工具时，至少运行 pytest 和 `git diff --check`。

## 安全与内容边界

- 不提交 API 密钥、Cookie、浏览器会话、登录截图、公众号账号数据和用户私人草稿。
- 事实性评论必须保留来源；不能读取原文时要求用户粘贴，不靠猜测补齐。
- 讽刺落点是组织结构和权力逻辑，不攻击真实个人的外貌、性别、地域或隐私。
- 医学、法律、财务等高风险内容必须核实，并明确不是专业意见。
- 所有外部发布动作都需要用户最终确认。

## 参与贡献

请阅读 [`CONTRIBUTING.md`](CONTRIBUTING.md)。修改 Skill 时需要提供行为基线、测试结果和变更后的前向验证；修改公众号自动化时不得提交登录态或真实账号数据。

## 许可证

本项目使用 [MIT License](LICENSE)。第三方素材、文章原文和平台内容仍受各自版权与服务条款约束。
