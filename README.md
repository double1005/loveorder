# 情绪点单 · Love Order — 项目文档

> 生成日期：2026-07-05
> 项目地址：https://github.com/double1005/loveorder
> 线上地址：https://double1005.github.io/loveorder/

---

## 一、项目概述

「情绪点单」是一个为异地恋情侣设计的双向互动网页应用。

- **小九**（在外地）使用点单页面，选择想对对方做的事情（看电影、亲亲、哄睡等）
- **舟舟**（在家里）使用收件箱，实时接收小九发来的点单

通过 **GitHub Issues API** 作为跨网络数据桥接，两端配置相同的 GitHub Token 后，无论相隔多远都能实时同步。

---

## 二、页面结构

### 2.1 点单页面（index.html）
**链接：** https://double1005.github.io/loveorder/

- 首页展示：小狗表情、标题「情绪点单」、名字「小九 → 舟舟」
- 菜单页：4 个分类（陪伴、关心、萌萌、惊喜、计划），每个分类下有多个选项（共 21 个）
- 确认页：展示已选的选项、可填写留言、选择时间（现在/今晚/明早/见面时）
- 结果页：下单完成，显示「📤 发送中…」→「✅ 已同步」反馈

### 2.2 收件箱（zhouzhou.html）
**链接：** https://double1005.github.io/loveorder/zhouzhou.html

- 展示所有收到的点单，按时间倒序排列
- 每个订单显示：时间、商品列表（含 sticker 图片）、留言
- 右上角同步状态指示器：🔄 同步中 / ✅ 已连接 / ⚠️ 同步失败
- 自动每 5 秒轮询 GitHub Issues
- 支持清空全部收单

---

## 三、数据流架构

### 3.1 完整流程

```
小九浏览器                          GitHub API                         舟舟浏览器
    │                                  │                                  │
    ├─ 打开页面 → 配置 Token ─────────┤                                  │
    │                                  │                                  ├─ 打开页面 → 配置 Token
    │                                  │                                  │
    ├─ 选择商品 → 填写留言 → 下单      │                                  │
    │  └─ 保存到 localStorage          │                                  │
    │  └─ POST /repos/.../issues       │                                  │
    │     └─ title: "小九的心意..."     │                                  │
    │     └─ body: JSON(商品列表,留言,时间)│                                │
    │     └─ labels: ["loveorder"]     │                                  │
    │                                  ├── 创建 Issue ──────────────────► │
    │                                  │                                  ├─ GET /repos/.../issues
    │                                  │                                  │  ?labels=loveorder
    │                                  │                                  │  &state=open
    │                                  │                                  │
    │                                  │◄── 返回 Issues 列表 ──────────── │
    │                                  │                                  ├─ 解析 JSON body
    │                                  │                                  ├─ 渲染到页面（含图片）
    │                                  │                                  ├─ 保存到 localStorage
    │                                  │                                  └─ PATCH 关闭 Issue
    │                                  │                                     state=closed
    │                                  │
    │                           Issue 被关闭
```

### 3.2 数据格式

下单时发送到 GitHub Issues 的 JSON 结构：

```json
{
  "items": [
    {"zh": "看电影", "desc": "同时打开，边看边聊", "img": 2, "cat": 0},
    {"zh": "亲亲", "desc": "啵啵", "img": 10, "cat": 2}
  ],
  "msg": "晚安",
  "time": "今晚",
  "date": "2026/7/5 16:30:00"
}
```

### 3.3 降级策略

- 若 GitHub API 不可用（无 Token、网络故障、被限流），自动降级到 localStorage
- 同一个浏览器下，不使用 Token 也可正常使用（仅本地保存）
- 收件箱从 GitHub 拉取到的新订单会同时保存到 localStorage 作为历史记录

---

## 四、跨网络同步配置

### 4.1 生成 GitHub Token

1. 访问 https://github.com/settings/tokens
2. 点击 **Generate new token (classic)**
3. 设置：
   - **Note**: `loveorder`
   - **Expiration**: **No expiration**
   - **Scopes**: 勾选 **`public_repo`**
4. 点击 **Generate token**，复制生成的 token 字符串（以 `ghp_` 开头）

### 4.2 在页面中配置

两个页面都需要配置相同的 Token：

| 页面 | 网址 | 使用者 |
|------|------|--------|
| 点单页面 | https://double1005.github.io/loveorder/ | 小九 |
| 收件箱 | https://double1005.github.io/loveorder/zhouzhou.html | 舟舟 |

配置步骤：
1. 首次访问自动弹出配置弹窗
2. 若没弹，点击标题旁的 **⚙️** 按钮
3. 填入 GitHub Token
4. 仓库名填写 `double1005/loveorder`（默认值）
5. 点击「**测试连接**」验证
6. 点击「**保存并同步**」

配置一次后 Token 保存在浏览器 localStorage 中，无需重复配置。如需修改，随时点击 ⚙️ 重新配置。

---

## 五、部署说明

### 5.1 GitHub Pages（当前方案）

- **仓库**: https://github.com/double1005/loveorder
- **分支**: `main`
- **根目录**: `/`
- **网址**: https://double1005.github.io/loveorder/

推送代码到 `main` 分支即可自动构建部署。

### 5.2 Vercel（备选方案）

根目录已有 `vercel.json`，导入部署即可：

```json
{
  "version": 2
}
```

---

## 六、已修复的问题

### 6.1 乱码问题
- **原因**: 文件使用 UTF-8 with BOM，部分 Windows 浏览器将 BOM 解析为可见字符
- **修复**: 重新保存为 UTF-8 without BOM

### 6.2 硬编码 GitHub Token
- **原因**: Token 直接写在 HTML 文件中，被 GitHub 推送保护拦截
- **修复**: 移除硬编码 Token，改为从 localStorage 读取，首次访问通过 UI 弹窗配置

### 6.3 配置弹窗不显示
- **原因**: ① `prompt()` 被现代浏览器拦截 ② 模态框 HTML 未正确插入（替换未匹配换行符）
- **修复**: ① 改用页面内模态框 ② 修复插入逻辑

### 6.4 ⚙️ 按钮无法点击
- **原因**: `<div>` 元素不带 `cursor:pointer` 时在某些浏览器上不可点击
- **修复**: 改为 `<span role="button" tabindex="0">`，同时添加 DOMContentLoaded 事件监听器

### 6.5 收件箱空状态逻辑错误
- **原因**: 渲染订单后空状态仍显示
- **修复**: 增加 `hasData` 标志控制

### 6.6 其他
- 移除未使用的 `imgMap` 死代码
- 删除重复的菜单项「我想你」
- 添加订单同步状态反馈（📤发送中→✅已同步/❌失败）
- 添加连接测试按钮

---

## 七、贴纸资源

位于 `outputs/img/` 目录，共 23 张 PNG 贴纸（sticker-01.png ~ sticker-23.png）：
- 01: 默认小狗（首页展示）
- 02~11, 13~22: 各菜单项对应配图
- 12: 未使用
- 23: 「我想你」配图

贴纸命名规则：`sticker-{两位数字}.png`

---

## 八、技术栈

| 层面 | 技术 |
|------|------|
| 前端 | 纯 HTML + CSS + JavaScript（无框架） |
| 后端 | GH Pages 纯静态 / GitHub Issues API（数据桥接） |
| 部署 | GitHub Pages |
| 数据存储 | 浏览器 localStorage + GitHub Issues |
| 代码托管 | GitHub (double1005/loveorder) |

---

## 九、本地开发

```bash
# 克隆仓库
git clone https://github.com/double1005/loveorder.git
cd loveorder

# 启动本地服务器（可选，需要 Node.js）
npm install
npm start
# 访问 http://localhost:3000

# 或者直接用 Python 启动简单服务器
python -m http.server 8080
# 访问 http://localhost:8080
```

---

*文档结束*
