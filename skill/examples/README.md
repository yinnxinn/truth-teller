# 虚构测试材料示例

本目录只提供原创、虚构的测试材料，不是第三方文章，也不代表任何真实公司的政策。

## 输入通知

```text
从下周起，公司将推行“自主奋斗计划”。员工可自愿在晚间参加跨部门协同，参与情况会作为季度人才盘点的参考。
```

## 结构化文章片段

将下面内容保存为本目录中的 `article.json`：

```json
{
  "title": "自愿协同，谁来承担晚间成本？",
  "date": "2026-09-02",
  "author": "毒舌职场真相官",
  "template": "magazine",
  "lead": "虚构通知中的自愿安排，仍需要说明参与成本与评价后果。",
  "verdict": "把晚间参与与人才盘点并列，会让所谓自愿承受额外解释压力。",
  "sections": [{
    "heading": "自愿的评价暗线",
    "quote": "参与情况会作为季度人才盘点的参考。",
    "comment": "这是基于该虚构通知的评论，不是对任何真实公司制度的事实陈述。"
  }],
  "judge_body": "协同的价值应由目标、时间成本和不参与的后果共同说明。",
  "footer": "本文为原创虚构测试材料，仅用于演示。"
}
```

## 生成 HTML

在仓库根目录运行：

```bash
python scripts/gen_wechat_safe.py --config examples/article.json --out examples/article.html --no-images
```

生成后先在本地审阅 `examples/article.html`，再按[技能说明](../SKILL.md)手动粘贴到公众号编辑器。示例不包含账号、Cookie、登录截图或真实文章内容。
