#!/usr/bin/env python3
"""
配图生成器（Gemini API 备选方案） — 毒舌职场真相官 skill

优先使用内置 ImageGen 工具（无需 API Key / 代理）。
本脚本仅在 ImageGen 不可用、且用户已配置 Gemini API Key 时使用。

依赖: pip install httpx  (无需 google-genai)

用法:
  1) 确保 GEMINI_API_KEY 已设置
  2) python gen_images.py --prompts prompts.json --outdir .
  或:
  2) python gen_images.py --article-topic "职场PUA" --outdir .

prompts.json 格式:
  [
    {"filename": "图1.png", "prompt": "扁平插画风格……"},
    {"filename": "图2.png", "prompt": "扁平插画风格……"}
  ]

注意: 本脚本直连 Google REST API，不依赖 google-genai 库。
      如果直连不通，可设置 HTTPS_PROXY 环境变量。
"""

import os
import sys
import json
import time
import base64
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

API_URL = f"https://generativelanguage.googleapis.com/v1beta/models/{MODEL}:generateContent?key={KEY}"


def generate_image(prompt: str, out_path: str) -> bool:
    """生成单张配图，保存到 out_path。成功返回 True。"""
    body = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {"responseModalities": ["IMAGE"]},
    }
    try:
        proxy = os.environ.get("HTTPS_PROXY") or os.environ.get("HTTP_PROXY")
        client_kwargs = {"timeout": 180.0}
        if proxy:
            client_kwargs["proxy"] = proxy
        with httpx.Client(**client_kwargs) as client:
            resp = client.post(API_URL, json=body)

            if resp.status_code != 200:
                print(f"  [失败] HTTP {resp.status_code}: {resp.text[:200]}")
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
                    print(f"  已保存：{out_path} ({len(img_bytes)} bytes)")
                    return True

            print(f"  [警告] 未返回图片数据，跳过 {out_path}")
            return False
    except Exception as e:
        print(f"  [失败] {out_path}: {type(e).__name__}: {e}")
        return False


def default_prompts(topic: str = "") -> list:
    """根据文章主题生成默认配图 prompt"""
    topic_text = f"主题：{topic}。" if topic else ""
    return [
        {
            "filename": "img1.png",
            "prompt": (
                f"扁平插画风格，适合手机窄栏公众号。{topic_text}"
                "画面：抽象概念图，表现'包装与真相'的对比——华丽的表面被揭开一角，"
                "露出底下朴素的真实。莫兰迪低饱和色，矢量扁平风，温馨不惊悚，"
                "不出现真实人脸、不模拟真实手术或医疗操作。"
            ),
        },
        {
            "filename": "img2.png",
            "prompt": (
                f"扁平插画风格，适合手机窄栏公众号。{topic_text}"
                "画面：一个抽象的'判官'符号（天平、放大镜或放大镜下的文字），"
                "搭配简洁的装饰元素。矢量扁平风，明亮温暖色，积极正向，"
                "不出现真实患者肖像、不模拟真实医疗操作。"
            ),
        },
    ]


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="生成公众号配图（Gemini REST API）")
    parser.add_argument("--prompts", default=None, help="prompts.json 文件路径")
    parser.add_argument("--article-topic", default="", help="文章主题（用于生成默认 prompt）")
    parser.add_argument("--outdir", default=".", help="输出目录")
    args = parser.parse_args()

    if args.prompts:
        with open(args.prompts, "r", encoding="utf-8") as f:
            prompts = json.load(f)
    else:
        prompts = default_prompts(args.article_topic)

    os.makedirs(args.outdir, exist_ok=True)

    success = 0
    for item in prompts:
        fname = item["filename"]
        prompt = item["prompt"]
        out = os.path.join(args.outdir, fname)
        print(f"正在生成 {fname}（模型 {MODEL}）……")
        t0 = time.time()
        if generate_image(prompt, out):
            success += 1
        print(f"  耗时 {time.time() - t0:.1f}s")

    print(f"\n完成：{success}/{len(prompts)} 张配图生成成功。")
    sys.exit(0 if success == len(prompts) else 1)
