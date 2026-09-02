# 微信公众号自动化迁移设计

## 目标

把现有 skill、文章生成模板、图片、公众号草稿自动化脚本和历史产物集中到 `D:\wechat`，同时保留原始目录作为回滚副本。

## 边界

- 本轮不删除、不移动原始文件。
- 本轮不自动发布公众号，只允许保存草稿。
- 历史一次性脚本放入 `legacy/`，新代码从 `app/` 进入。
- 新运行产物分别放入 `content/`、`assets/`、`runs/` 和 `logs/`。

## 结构

`app/config.py` 负责根目录和运行参数；`app/paths.py` 负责历史成果定位；`app/run_pipeline.py` 负责检查迁移结果和列出可复用正文。后续内容获取、生成和公众号 CDP 操作将在这个边界上逐步替换旧脚本。

## 验收标准

1. `D:\wechat\skill\SKILL.md` 存在。
2. `D:\wechat\legacy\WorkBuddy` 与原 WorkBuddy 文件数量和关键产物可核对。
3. `python app\run_pipeline.py --check` 返回 `CHECK OK`。
4. `python app\run_pipeline.py --list` 能列出历史富格式正文。
5. 原始目录仍然存在。
