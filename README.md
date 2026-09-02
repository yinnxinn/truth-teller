# 微信公众号内容自动化工作区

此目录是从现有 WorkBuddy 项目迁移后的独立工作区。

## 目录

- `app/`：统一路径、配置和运行入口
- `skill/`：可复用的 `toxic-corporate-truth-teller` skill
- `content/`：后续运行产生的源文、草稿和已发布归档
- `assets/`：后续运行产生的配图和封面
- `runs/`：每次运行的独立产物
- `legacy/`：原始成果的只读参考副本，不作为新代码入口
- `docs/`：迁移说明和运行计划

## 当前迁移范围

已复制：

1. 原 skill、模板、参考文档和脚本
2. `C:\\Users\\www19\\WorkBuddy` 下的历史任务、文章、图片、截图和调试脚本
3. 最近一次公众号草稿自动化成果

原始目录保留在原位置，不由本项目删除或修改。

## 运行前提

- Windows + Python 3.10+
- 公众号后台浏览器已登录
- 浏览器开启 CDP `9222` 端口
- Python 依赖见 `requirements.txt`

## 基础命令

```powershell
cd D:\wechat
python app\run_pipeline.py --check
python app\run_pipeline.py --list
```

公众号上传仍然以“保存草稿”为终点，不自动点击“发表”。
