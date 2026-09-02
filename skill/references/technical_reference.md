# 微信公众号编辑器技术参考

## 编辑器架构

微信公众号文章编辑器经历多个版本。正确识别当前版本是内容注入成功的关键。

### 当前版本：ProseMirror (2024+)

微信约 2024 年从 UEditor 迁移到 ProseMirror。关键特征：

```
选择器: .ProseMirror (或 .ProseMirror.ProseMirror-focused)
类型: contenteditable div
框架: React + ProseMirror
状态管理: ProseMirror 内部状态（非 React state）
事件模型: ProseMirror transactions
```

**内容注入方法**:
```javascript
var editor = document.querySelector('.ProseMirror');
editor.focus();
editor.innerHTML = htmlString;
editor.dispatchEvent(new Event('input', { bubbles: true }));
// 同时派发 change 事件处理边缘情况
editor.dispatchEvent(new Event('change', { bubbles: true }));
```

**注意事项**:
- `innerHTML` 赋值有效，因为 ProseMirror 监听 DOM 变更
- `input` 事件必须 `{bubbles: true}`，事件委托才能捕获
- 注入后不要点击其他元素，否则编辑器可能重置
- 标题和正文是**独立元素**，需分别注入

### 旧版本：UEditor (2024 前)

```
选择器: #ueditor_0 或 .edui-body-container
类型: iframe 或 contenteditable div
```

注入方法类似（innerHTML + event），选择器不同。

## 标题输入行为

公众号编辑器的标题字段**不是标准 `<input>` 元素**：

- 它是 `contenteditable` div，class 为 `weui-desktop-title__input`
- 快照工具可能报告为 `textbox [ref=eXX]`
- **React synthetic value 不可靠**
- **`.value` 赋值无效**

**可靠方法**：用 agent-browser 的 click + keyboard type:
```bash
agent-browser click <title_ref>
agent-browser keyboard type "文章标题"
```

## 常见元素 Ref（来自快照）

这些 ref 是动态的，每次会话都会变。始终用 `snapshot -i` 获取当前值：

| 元素 | 典型 Ref 模式 | 识别方式 |
|---|---|---|
| 标题输入框 | `e53` 附近 | 显示"请在这里输入标题" |
| 正文编辑器 | `e52` | 有 contenteditable 属性 |
| 保存草稿按钮 | `e39` | 按钮文字"保存为草稿" |
| 发表按钮 | `e37` | 按钮文字"发表" |
| 预览按钮 | `e38` | 按钮文字"预览" |
| 文章按钮（首页） | `e12` | "新的创作"区域下 |

## CSS 兼容性

注入编辑器的 HTML 必须使用**全内联样式**，外部样式表会被清除。

### 支持的样式属性

- `color`, `font-size`, `font-weight`, `font-style`
- `background`, `background-color`
- `padding`, `margin`, `border`, `border-left`, `border-radius`
- `text-align`, `text-indent`, `line-height`, `letter-spacing`
- `width`, `height`, `vertical-align`

### 禁用 / 会被清除

- 外部 `<link>` 样式表
- `<style>` 块（可能被编辑器移除）
- `position: absolute/fixed`（破坏布局）
- `display: flex`（部分版本不支持）
- `box-shadow`, `text-shadow`
- `linear-gradient`（用纯色替代）
- 复杂动画
- 自定义字体（用系统字体）

### 图片处理

- **base64 内联**：`<img src="data:image/jpeg;base64,...">` — 微信编辑器会自动上传到 mmbiz.qpic.cn CDN
- **外部图床链接**：不可靠，不推荐
- **本地文件路径**：不支持

## 登录流程

### 公众号后台 URL 模式

```
登录页: https://mp.weixin.qq.com/ (显示二维码)
扫码后: https://mp.weixin.qq.com/home?token=XXXXXXXX&lang=zh_CN
编辑器: https://mp.weixin.qq.com/cgi-bin/appmsg?t=media/appmsg_edit&action=edit&type=77&token=XXXX...
```

`token` 参数表示活跃登录会话。有效 token 通常持续数小时。

### 二维码扫码检测

导航到登录页后：
1. 截图显示二维码 → 需要用户扫码
2. 约 5-10 秒后 URL 变为含 `token` → 登录成功
3. 超时（60s+ 无 token）→ 二维码过期，需刷新

## 常见失败模式与恢复

| 症状 | 原因 | 恢复方法 |
|---|---|---|
| 注入后标题不显示 | React 合成事件不匹配 | 改用 click + keyboard type |
| 正文输入后消失 | ProseMirror 焦点变化时重置 | 先注入正文，再点击其他元素 |
| 保存按钮无响应 | 内容过大或网络问题 | 等待更长时间，重试保存 |
| 二维码扫码超时 | 用户未及时扫码 | 重新截图，提示用户 |
| 图片生成超时 | 模型队列满 | 用纯色占位块 + emoji 替代 |

## 文件输出约定

| 文件 | 用途 |
|---|---|
| `真相官-xxx-公众号-微信版.html` | 最终微信版 HTML（全内联样式） |
| `真相官-xxx-公众号-微信版_body.html` | 仅 body 内容（供 inject_body.js 使用） |
| `article.json` | 文章结构化数据（供 gen_wechat.py 使用） |
| `cover.png` / `img1.png` / `img2.png` | AI 生成的配图 |
| `wechat_*.png` | 公众号后台截图 |
