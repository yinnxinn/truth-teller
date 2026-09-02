# Gemini 图像 API 配置指南（备选方案）

## 何时使用

本 skill 的**首选图片生成方案**是内置 ImageGen 工具（无需 API Key、无需代理）。

Gemini API 仅在以下情况使用：
- ImageGen 不可用或超时
- 用户偏好 Gemini 生图质量
- 需要特定 Gemini 模型风格

## 依赖

```bash
pip install httpx Pillow
```

> **注意**: 本 skill 已从 `google-genai` 库迁移为直接调用 REST API（通过 `httpx`）。
> 原因：`google-genai` 库在部分网络环境下存在代理兼容性问题（SSL 握手超时），
> 而直接用 `httpx` 调 REST API 稳定可靠。

## API Key 配置

`GEMINI_API_KEY` 环境变量：

**macOS / Linux**（仅当前会话有效）：
```bash
export GEMINI_API_KEY="你的密钥"
```

**Windows PowerShell**（仅当前会话有效）：
```powershell
$env:GEMINI_API_KEY="你的密钥"
```

**永久生效**：写入用户级 shell 配置文件（如 `~/.bashrc`、PowerShell `$PROFILE`）或个人 `.env` 文件。

**安全红线**：
- 切勿提交进 git 仓库
- 切勿写进 Skill 文件
- 切勿写死在脚本里

## 网络配置

本 skill 的脚本通过 `httpx` 直连 Google REST API。

- **直连**：大多数网络环境可直接访问 `generativelanguage.googleapis.com`
- **代理**：如直连不通，设置 `HTTPS_PROXY` 环境变量：
  ```bash
  export HTTPS_PROXY=http://127.0.0.1:你的代理端口
  ```
- **超时**：脚本默认 180 秒超时，复杂 prompt 可能需要 60-120 秒生成

## 模型名

默认使用 `gemini-2.5-flash-image`。若报 404/not found：

1. 先列出可用模型确认：
   ```bash
   curl "https://generativelanguage.googleapis.com/v1beta/models?key=$GEMINI_API_KEY"
   ```
2. 用环境变量覆盖：
   ```bash
   export GEMINI_IMAGE_MODEL="正确的模型名"
   ```

## 脚本使用

### 生成封面图

```bash
python scripts/gen_cover.py --prompt "讽刺插画prompt" --out cover.png
```

不传 `--prompt` 时使用默认的"震惊体广告牌"prompt。

### 生成配图

```bash
# 使用默认 prompt（指定文章主题）
python scripts/gen_images.py --article-topic "职场PUA" --outdir .

# 使用自定义 prompts.json
python scripts/gen_images.py --prompts my_prompts.json --outdir .
```

`prompts.json` 格式：
```json
[
  {"filename": "img1.png", "prompt": "扁平插画风格……"},
  {"filename": "img2.png", "prompt": "扁平插画风格……"}
]
```

## 调用模板（代码级参考）

```python
import httpx, base64, os

KEY = os.environ.get("GEMINI_API_KEY")
MODEL = "gemini-2.5-flash-image"

url = f"https://generativelanguage.googleapis.com/v1beta/models/{MODEL}:generateContent?key={KEY}"
body = {
    "contents": [{"parts": [{"text": "讽刺扁平插画：西装老板在台上讲PPT，台下员工戴着电子脚镣"}]}],
    "generationConfig": {"responseModalities": ["IMAGE"]},
}

with httpx.Client(timeout=180.0) as client:
    resp = client.post(url, json=body)
    if resp.status_code == 200:
        data = resp.json()
        parts = data["candidates"][0]["content"]["parts"]
        for part in parts:
            inline_data = part.get("inlineData", {})
            if inline_data.get("data"):
                img_bytes = base64.b64decode(inline_data["data"])
                with open("cover.png", "wb") as f:
                    f.write(img_bytes)
                break
```

## 使用约束

- 仅生成装饰 / 讽刺类插图
- 涉及健康、儿童、新闻事件时，用合规授权素材或用户自有图，不用 AI 仿真图
- 不生成真实人物肖像、仿真医学图、新闻现场图
- 生成后必须由用户审核确认再发布
