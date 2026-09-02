"""生成「周报题材」真相官单篇的封面与文中配图。

纯本地扁平抽象图：莫兰迪/深蓝品牌色、无真实面孔、无渐变禁止项之外需谨慎——无需 CSS。
封面 900x383 (公众号 2.35:1)，文中图 750x260。
"""
import os
from PIL import Image, ImageDraw

OUT = r"D:\wechat\content\drafts\2026-09-02-weekly-report-tyranny\images"
os.makedirs(OUT, exist_ok=True)


def flat_cover(path, w=900, h=383):
    img = Image.new("RGB", (w, h), "#2b3a55")
    d = ImageDraw.Draw(img)
    # 大色块背景 + 几条“文件/时间线”抽象元素
    block_colors = ["#3c4f6e", "#56799d", "#edf3f8"]
    y = 58
    for i, c in enumerate(block_colors):
        bx = 54 + i * 96
        d.rounded_rectangle([bx, y, bx + 56, y + 128], radius=10, fill=c)
        y += 2
    # 折角“纸张”卡片堆叠
    card_colors = ["#ffffff", "#dfe7ef", "#c2d0dd"]
    for k, c in enumerate(card_colors):
        x = 470 + k * 40
        d.polygon([(x, 120), (x + 210, 120), (x + 210, 210), (x, 210)], fill=c)
    # 强调小方块（被夹住的“样子”）
    for r in range(3):
        d.rounded_rectangle([w - 180, 300 - r * 34, w - 120, 330 - r * 34], radius=6, fill="#8aa2bf")
    img.save(path, "JPEG", quality=92)


def flat_inline(path, w=750, h=260, accent="#56799d", dark=False):
    bg = "#1f2b3f" if dark else "#f2f5f9"
    fg = "#ffffff" if dark else "#56799d"
    img = Image.new("RGB", (w, h), bg)
    d = ImageDraw.Draw(img)
    # 居中细长的“汇报条” + 一列勾选方块
    bar_x, bar_y, bar_w, bar_h = 130, 120, 400, 22
    d.rounded_rectangle([bar_x, bar_y, bar_x + bar_w, bar_y + bar_h], radius=11, fill=fg)
    for i in range(6):
        gx = bar_x + 28 + i * 58
        gy = bar_y + 4
        d.rounded_rectangle([gx, gy, gx + 14, gy + 14], radius=3, outline="#c7d2de", width=2)
    # 右侧向上的小箭头（表示“已读/上升”）
    ax, ay = bar_x + bar_w + 46, bar_y + 11
    d.polygon([(ax - 26, ay + 16), (ax, ay - 34), (ax + 26, ay + 16)], fill=fg)
    img.save(path, "JPEG", quality=90)


flat_cover(os.path.join(OUT, "cover.jpg"))
flat_inline(os.path.join(OUT, "inline-1.jpg"))
flat_inline(os.path.join(OUT, "inline-2.jpg"), accent="#c05252", dark=True)
print("images written to", OUT)
for f in os.listdir(OUT):
    print(" ", f, os.path.getsize(os.path.join(OUT, f)))
