#!/usr/bin/env python3
"""
封面图生成器（Gemini API 备选方案） — 毒舌职场真相官 skill

优先使用内置 ImageGen 工具（无需 API Key / 代理）。
本脚本仅在 ImageGen 不可用、且用户已配置 Gemini API Key 时使用。

依赖: pip install httpx  (无需 google-genai)

用法:
  1) 确保 GEMINI_API_KEY 已设置:
     - macOS/Linux:  export GEMINI_API_KEY="你的密钥"
     - Windows PowerShell:  $env:GEMINI_API_KEY="你的密钥"
  2) python gen_cover.py --prompt "讽刺插画prompt" --out cover.png

注意: 本脚本直连 Google REST API，不依赖 google-genai 库。
      如果直连不通，可设置 HTTPS_PROXY 环境变量。
"""

import base64
import os
import sys
import time
import argparse

try:
    import httpx
except ImportError:
    sys.exit("未安装 httpx，请先运行: pip install httpx")

KEY = os.environ.get("GEMINI_API_KEY")
if not KEY:
    sys.exit(
        "找不到 GEMINI_API_KEY，请先设置:\n"
        "  macOS/Linux:  export GEMINI_API_KEY='你的密钥'\n"
        "  PowerShell:   $env:GEMINI_API_KEY='你的密钥'"
    )

MODEL = os.environ.get("GEMINI_IMAGE_MODEL", "gemini-2.5-flash-image")

# 默认 prompt（可通过 --prompt 覆盖）
DEFAULT_PROMPT = (
    "扁平讽刺插画封面，留白多，适合手机窄栏公众号。"
    "画面：一块夸张的'震惊体'标题广告牌（写'震惊！'字样），"
    "正被人手撕开一角，露出底下一张小小的、朴素的'请及时就医'便签。"
    "莫兰迪低饱和色，矢量扁平风，无照片质感，不出现真实人物面孔。"
)


def generate_cover(prompt: str, out_path: str) -> bool:
    """生成封面图，保存到 out_path。成功返回 True。"""
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{MODEL}:generateContent?key={KEY}"
    body = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {"responseModalities": ["IMAGE"]},
    }

    print(f"正在用模型 {MODEL} 生成封面图……")
    t0 = time.time()
    try:
        # 清除代理环境变量，直连 Google API（国内通常可直连）
        proxy = os.environ.get("HTTPS_PROXY") or os.environ.get("HTTP_PROXY")
        client_kwargs = {"timeout": 180.0}
        if proxy:
            # 如果设了代理，尝试用代理；否则直连
            client_kwargs["proxy"] = proxy
        with httpx.Client(**client_kwargs) as client:
            resp = client.post(url, json=body)
            elapsed = time.time() - t0

            if resp.status_code != 200:
                print(f"生成失败：HTTP {resp.status_code}, 耗时 {elapsed:.1f}s")
                print(f"响应: {resp.text[:300]}")
                return False

            data = resp.json()
            parts = (
                data.get("candidates", [{}])[0]
                .get("content", {})
                .get("parts", [])
            )

            for part in parts:
                inline_data = part.get("inlineData", {})
                if inline_data.get("data"):
                    img_bytes = base64.b64decode(inline_data["data"])
                    with open(out_path, "wb") as f:
                        f.write(img_bytes)
                    print(
                        f"封面已生成：{out_path} ({len(img_bytes)} bytes, 耗时 {elapsed:.1f}s)"
                    )
                    return True

            print(f"[警告] API 返回里没有图片数据 (耗时 {elapsed:.1f}s)")
            print(f"返回内容: {str(data)[:300]}")
            return False

    except Exception as e:
        elapsed = time.time() - t0
        print(
            f"生成失败：{type(e).__name__}: {e} (耗时 {elapsed:.1f}s)\n"
            f"（若为网络超时，请设置 HTTPS_PROXY 后重试；"
            f"若为模型不存在，请用 GEMINI_IMAGE_MODEL 指定正确模型名）"
        )
        return False


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="生成公众号封面图（Gemini REST API）")
    parser.add_argument("--prompt", default=DEFAULT_PROMPT, help="封面图 prompt")
    parser.add_argument("--out", default="cover.png", help="输出文件路径")
    args = parser.parse_args()

    ok = generate_cover(args.prompt, args.out)
    sys.exit(0 if ok else 1)
