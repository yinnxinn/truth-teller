# skill 维护与版本跟踪（How to keep optimizing the skill）

本仓库 `toxic-corporate-truth-teller`（GitHub 私有：`yinnxinn/toxic-corporate-truth-teller`）
以 **源码视角** 跟踪 skill 及其在登录态公众号上真正能跑通的发草稿机器（`app/*.mjs/*.py`），
方便你每次优化都能留下历史、回滚、并让 Codex 与工作区同步到同一份源。

## 目录里跟踪了什么（不看 / 会看什么）

纳入版本（源码，按需提交）：
- `skill/`  —— SKILL.md + assets 模板 + scripts + references（skill 本体）
- `app/`    —— 真相官真机发草稿用脚本：生成 / cover·配图渲染 / CDP 注入保存草稿 / 校验 / 后台快照
- `docs/`   —— 方案与设计；`README.md`、`requirements.txt`
- `.gitignore` / `.gitattributes`

刻意不纳入（输出物 / 镜像 / 会话，正文可由 app 脚本再生成）：
- `content/drafts|published`（草稿成品 HTML/图片，用 app 可复现）
- `legacy/`（728MB 只读参考副本）、`browser-profile/`（436MB 会话）、`logs/`、`runs/`、`*.png` 大图

> 想临时把某批草稿入库：把 `.gitignore` 里对应 `/content/drafts/` 等注释后再 `git add`，
> 或用反向解 `!content/drafts/<某目录>`。

## 日常优化流程（推荐写得很碎）

1. 改源码 → 本地跑通（生成 → 渲染图 → CDP 存草稿 → 快照核对）。见 `README.md` 基础命令与 `docs/*`。
2. 提交，一个逻辑改动一个 commit，消息尽量写“为什么”：
   ```powershell
   git add -A
   git commit -m "feat(app): 新增封面自动渲染/标题注入稳定性修复"
   git push            # 已设 origin + upstream(master)
   ```
3. 需要时本地 `git diff`/`git log -p` 考古，可 `git revert`/`git checkout` 回滚出问题的点。

## 一键同步到 Codex 安装目录

skill 在 Codex 里也有一份：`C:\Users\www19\.codex\skills\toxic-corporate-truth-teller`
保持“只改仓库这一份源，再同步过去”，避免两份漂移。手动替换（仅文件级，不做删除以免误删其它 skill）：

```powershell
Copy-Item -Path "D:\wechat\skill\*" -Destination "C:\Users\www19\.codex\skills\toxic-corporate-truth-teller\" -Recurse -Force
```

## 关于两处 gen_wechat_rich.py 的分歧

- `D:\wechat\skill\scripts\gen_wechat_rich.py` = 旧/简化版（通用单模板）
- Codex 目录那份 = 较新版（内置 cool/classic/warm 三套主题 + 判词框引擎），**当前更完整**

仓库现跟踪的是 `D:\wechat\skill` 那份。若要采用更完整的主题引擎，建议：
把 Codex 较新版 `gen_wechat_rich.py` 覆盖进 `skill/scripts/` 并提交（一次明确 commit），
并让生成器/发草稿脚本后续统一调用它。改好后再用上面的同步命令同步回 Codex 与小程序仓库。

## 建议的下一组优化（增量，可逐一提交）

1. 加 `validate_wechat_html.py`：存草稿前自动报出未替换的 `{{占位符}}`、微信会清空的
  `linear-gradient/flex/position/box-shadow`，防排版烂。
2. 收敛 `app` 里 40+ 到几个稳定入口（如 `run_pipeline.py draft-new/verify`），统一取 manifest 的语义。
3. 把“复用已登录浏览器做 CDP 存草稿”的真链路写回 `skill/SKILL.md` Phase 4（替换不存在的 agent-browser 步骤）。
4. （可选）把 Codex 较新 `gen_wechat_rich.py` 三主题引擎正式采纳并纳入本仓库默认实现。
