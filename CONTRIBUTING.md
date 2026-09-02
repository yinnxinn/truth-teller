# 参与贡献

感谢你帮助改进 Workplace Truth Teller。请把一次提交控制在一个清晰目标内，并说明它改善了哪个真实使用场景。

## 开发流程

1. 从最新默认分支创建功能分支，不直接强推默认分支。
2. 修改 Skill 行为前，先用同一请求记录没有新规则时的行为基线。
3. 先写能暴露问题的测试，再进行最小修改。
4. 运行覆盖测试、官方 Skill 校验和差异检查。
5. 拉取请求中写明 RED、GREEN、影响范围和人工验证结果。

## 验证命令

```powershell
python -m pip install pytest pyyaml
python -m pytest skill/tests -v
python -m pytest tests -v
$env:PYTHONUTF8 = "1"
python "$env:USERPROFILE\.codex\skills\.system\skill-creator\scripts\quick_validate.py" skill
git diff --check
```

macOS/Linux 的官方校验命令：

```bash
PYTHONUTF8=1 python "${CODEX_HOME:-$HOME/.codex}/skills/.system/skill-creator/scripts/quick_validate.py" skill
```

没有 Codex 内置校验器时，至少运行两组 pytest 和 `git diff --check`。

## 禁止提交

- API 密钥、`.env`、Cookie、浏览器配置和会话文件。
- 公众号登录截图、后台快照和真实账号标识。
- 未获授权的完整第三方文章、用户草稿和私人素材。
- `__pycache__`、测试缓存、运行日志和生成的 HTML。

## 拉取请求清单

- [ ] 变更目标和用户价值清楚。
- [ ] 新行为有失败测试或行为基线。
- [ ] 列出实际执行的验证命令与结果。
- [ ] 没有把实验自动化描述成稳定能力。
- [ ] 没有新增秘密、账号数据或受版权保护的完整内容。
