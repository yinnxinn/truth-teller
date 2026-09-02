# Skill 维护与版本跟踪

公共仓库：`yinnxinn/workplace-truth-teller`。

本项目同时维护两层能力：

- `skill/`：可独立安装的 `toxic-corporate-truth-teller` Codex Skill。
- `app/`：依赖本机浏览器、CDP 和公众号登录态的实验自动化工作区。

稳定内容生成与微信安全版 HTML 应优先在 `skill/` 完成；`app/` 不得被包装成跨环境保证可用的一键发布产品。

## 版本范围

应该提交：

- `skill/` 中的指令、模板、脚本、参考资料和测试。
- `app/` 中可复现的源代码与离线测试。
- `README.md`、`CONTRIBUTING.md`、`LICENSE`、`docs/` 和 CI。

不得提交：

- `content/drafts/`、`content/published/` 和运行生成的 HTML。
- 浏览器 profile、Cookie、会话、后台截图和真实账号数据。
- API 密钥、`.env`、日志、缓存和临时产物。
- 未获授权的完整第三方文章与用户私人草稿。

## 日常修改流程

1. 从最新默认分支创建功能分支。
2. 修改行为前记录基线；先写失败测试，再做最小修改。
3. 先验证 `skill/`，再验证仓库级布局和离线应用测试。
4. 提交后推送功能分支，通过拉取请求合并，不强推默认分支。

```powershell
python -m pip install pytest pyyaml
python -m pytest skill/tests -v
python -m pytest tests app/test_dingtalk_one_truth_article.py -v
$env:PYTHONUTF8 = "1"
python "$env:USERPROFILE\.codex\skills\.system\skill-creator\scripts\quick_validate.py" skill
git diff --check
```

## 同步到本机 Codex

仓库中的 `skill/` 是维护源。安装目录通常是：

```text
~/.codex/skills/toxic-corporate-truth-teller
```

目标目录已存在时先核对并备份，不自动覆盖。修改后可把 `skill/` 复制到一个新的临时目录，比较差异并由用户确认替换。

## HTML 生成器边界

- `skill/scripts/gen_wechat_safe.py` 是默认稳定交付路径。
- `gen_wechat.py` 和 `gen_wechat_rich.py` 用于兼容或富格式探索。
- `skill/assets/article_template.html` 是旧版兼容参考，不用于默认安全输出。
- 只有真实运行安全生成器得到的结果才能称为“微信安全版 HTML”。

## 浏览器与草稿自动化

只有用户明确要求并授权、浏览器已登录、控制能力可访问登录态、页面结构可识别时，才使用 `app/` 中的实验脚本。保存后必须验证明确成功信号；无法验证就回退到 HTML 手动粘贴。

项目不自动发布文章。正式发表属于新的外部操作授权，不能从“生成文章”或“保存草稿”推导。

## 后续优化方向

1. 收敛 `app/` 中重复入口，形成少数稳定命令。
2. 为不依赖登录态的生成与校验脚本增加离线测试。
3. 把公众号页面适配逻辑集中到可替换模块，减少页面改版影响。
4. 为 Skill 的真实用户场景持续补充行为测试，而不是堆积口号式规则。
