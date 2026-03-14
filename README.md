> 一款由 AI 驱动的读书笔记与书籍管理平台，面向真正有阅读习惯的你。📚✨

---

# BookVibe-AI · 智享书摘  

## 项目简介

**BookVibe-AI** 是一款集 **书籍管理、读书笔记记录、AI 智能总结、读后感优化、拓展阅读推荐** 于一体的全栈 Web 应用。

项目从零自研：

- 后端基于 **Node.js + Express + MySQL** 提供 RESTful API；
- 前端使用 **Vite + 原生 HTML/CSS/JavaScript** 实现轻量但正式的 Web 界面；
- 借助 **讯飞 Spark 大模型 HTTP API**，完成笔记总结、读后感优化与延伸书单推荐；
- 针对 **桌面端 + 安卓 + iOS** 进行了专门的布局与样式适配；
- 最终部署在 **Ubuntu + Nginx + PM2** 的服务器环境，具备完整的上线运维能力。

---

## 在线体验地址

- 正式站点（HTTP/HTTPS 均支持）：
  - https://huoyaadxijie.cn
  - https://www.huoyaadxijie.cn

> 建议使用 Chrome / Edge / Safari 的最新版本访问，移动端可直接浏览器打开体验。

---

## 功能特性 Features

### 1. 书籍管理

- 新建 / 修改 / 删除书籍信息
- 支持书名、作者、分类（类型）维护
- 删除书籍时自动级联删除关联的笔记与 AI 建议（数据库外键约束）

### 2. 阅读笔记记录

- 为每本书创建多条读书笔记
- 支持：
  - 原文摘抄（必填）
  - 个人读后感（选填）
- 笔记列表支持：
  - 展开/收起查看全文
  - 按书籍维度进行归档

### 3. AI 自动生成总结（Spark API）

- 基于用户的 **原文摘抄 + 读后感**，调用 **讯飞 Spark Pro HTTP 接口**：
  - 生成精炼的 AI 总结（`ai_summary`）
  - 输出为结构化 JSON，并写回数据库
- 请求失败时提供友好的回退文案，不影响整体使用

### 4. AI 优化读后感

- 在总结基础上，对用户原始感受进行：
  - 文字润色
  - 观点补充
  - 逻辑梳理
- 结果存入 `ai_suggestions.ai_feeling`，前端在笔记详情中集中展示

### 5. AI 推荐拓展阅读书籍

- 根据当前书籍内容与摘抄主题：
  - 推荐 2–3 本延伸阅读书
  - 采用统一格式存储：`书名1,理由1;书名2,理由2`
- 前端在 AI 建议区域中格式化展示，方便用户扩展阅读清单

### 6. 笔记收藏与置顶

- 支持对某条笔记 **收藏/取消收藏**
- 收藏记录存储在浏览器 `localStorage` 中：
  - 刷新页面后仍保留用户偏好
- 列表中收藏的笔记会自动置顶显示

### 7. 移动端适配（Responsive Design）

- 使用纯 CSS 媒体查询适配：
  - PC：双栏布局（左操作区 + 右列表区）
  - Pad：等宽双栏 / 两列书籍卡片
  - 手机：单列流式布局、合理缩放字号与内边距
- 针对手机端：
  - 顶部 Hero 区调整为上下布局
  - 主卡片去大圆角与重阴影，贴近原生 App 视觉

### 8. 正式上线部署能力

- 后端通过 **PM2** 守护进程常驻运行，支持日志与重启管理
- 前端使用 `npm run build` 打包为静态资源，由 **Nginx** 托管
- `/api` 路由由 Nginx 反向代理至本机 `http://127.0.0.1:3000`
- 具备从开发 → 测试 → 部署的完整流程实践价值

---

## 技术栈 Tech Stack

- **前端**
  - Vite
  - HTML5 / CSS3
  - 原生 JavaScript（Vue 3 单文件组件风格，无 TypeScript 依赖）
- **后端**
  - Node.js
  - Express
  - mysql2 / promise 连接池
- **数据库**
  - MySQL 8.x
- **AI 能力**
  - 讯飞 **Spark Pro HTTP API**（`/v1/chat/completions`）
- **部署 & 运维**
  - Ubuntu 24.04 LTS
  - Nginx
  - PM2

---

## 项目结构 Project Structure

> 仅展示关键目录与文件，省略部分构建产物与依赖目录。

```text
BookVibe-AI/
├── app.js                     # 后端入口（Express 应用）
├── package.json               # 后端依赖与脚本
├── package-lock.json
├── .env                       # 环境变量（本地/服务器各一份，未入库）
├── config/
│   ├── db.js                  # MySQL 连接池封装（mysql2/promise）
│   └── ai.js                  # 讯飞 Spark HTTP API 封装
├── controllers/
│   ├── bookController.js      # 书籍相关业务逻辑
│   └── noteController.js      # 笔记与 AI 建议业务逻辑
├── routes/
│   ├── books.js               # /api/books 路由
│   └── notes.js               # /api/notes 路由（含 AI 子路由）
├── frontend/
│   ├── index.html             # 前端入口 HTML
│   ├── package.json           # 前端依赖与脚本
│   ├── vite.config.js         # Vite 配置（含 /api 代理）
│   └── src/
│       ├── main.js            # 前端入口 JS，挂载 App.vue
│       ├── App.vue            # 主界面（表单 + 列表 + 状态）
│       └── style.css          # 全局样式与响应式适配
└── README.md                  # 项目说明（当前文档）
```

---

## 本地运行方式 Local Development

> 以下假设你已经在本机安装了 Node.js、MySQL。

### 1. 克隆项目

```bash
git clone https://github.com/yourname/BookVibe-AI.git
cd BookVibe-AI
```

### 2. 准备数据库

1. 启动 MySQL，并创建库：

   ```sql
   CREATE DATABASE IF NOT EXISTS ai_reading_note
     DEFAULT CHARACTER SET utf8mb4
     DEFAULT COLLATE utf8mb4_general_ci;
   USE ai_reading_note;
   ```

2. 创建表（节选）：

   ```sql
   -- 1. 书籍表
   CREATE TABLE IF NOT EXISTS books (
       id INT(11) NOT NULL AUTO_INCREMENT,
       book_name VARCHAR(100) NOT NULL,
       author VARCHAR(50) DEFAULT NULL,
       category VARCHAR(30) DEFAULT NULL,
       create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
       PRIMARY KEY (id)
   ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

   -- 2. 读书笔记表
   CREATE TABLE IF NOT EXISTS reading_notes (
       id INT(11) NOT NULL AUTO_INCREMENT,
       book_id INT(11) NOT NULL,
       excerpt TEXT NOT NULL,
       feeling TEXT DEFAULT NULL,
       ai_summary TEXT DEFAULT NULL,
       create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
       PRIMARY KEY (id),
       FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
   ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

   -- 3. AI 建议表
   CREATE TABLE IF NOT EXISTS ai_suggestions (
       id INT(11) NOT NULL AUTO_INCREMENT,
       note_id INT(11) NOT NULL,
       ai_feeling TEXT DEFAULT NULL,
       ai_recommend VARCHAR(200) DEFAULT NULL,
       update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
       PRIMARY KEY (id),
       FOREIGN KEY (note_id) REFERENCES reading_notes(id) ON DELETE CASCADE
   ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
   ```

### 3. 配置环境变量

在项目根目录创建 `.env`（本地开发用），示例：

```bash
# 应用端口
PORT=3000

# 数据库配置
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_local_password
DB_NAME=ai_reading_note

# 讯飞 Spark HTTP 接口
SPARK_API_BASE=https://spark-api-open.xf-yun.com/v1
SPARK_MODEL=generalv3
SPARK_API_KEY=your_spark_apipassword_here  # APIPassword，而非 APPID / APIKey / APISecret
```

> 注意：`.env` 不应提交到 Git 仓库，请在 `.gitignore` 中忽略。

### 4. 启动后端

```bash
# 在项目根目录
npm install
npm start
```

后端默认监听 `http://localhost:3000`。

### 5. 启动前端（开发模式）

```bash
cd frontend
npm install
npm run dev
```

Vite 默认在 `http://localhost:5173` 启动一个开发服务器，并将以 `/api` 开头的请求代理到 `http://localhost:3000`。

> 开发时访问：`http://localhost:5173` 即可进行前后端联调。

---

## 环境变量说明 Environment Variables

后端 `.env` 支持的关键环境变量：

| 变量名           | 必填 | 说明                                         |
|------------------|------|----------------------------------------------|
| `PORT`           | 否   | 后端服务端口，默认 `3000`                   |
| `DB_HOST`        | 是   | MySQL 主机地址                               |
| `DB_PORT`        | 否   | MySQL 端口，默认 `3306`                      |
| `DB_USER`        | 是   | MySQL 用户名                                 |
| `DB_PASSWORD`    | 是   | MySQL 密码                                   |
| `DB_NAME`        | 是   | 数据库名，例如 `ai_reading_note`            |
| `SPARK_API_BASE` | 否   | Spark HTTP 基础地址，默认官方地址           |
| `SPARK_MODEL`    | 否   | 模型名称，例如 `generalv3`                  |
| `SPARK_API_KEY`  | 是   | Spark HTTP **APIPassword**（非常机密）      |

---

## 部署说明 Deployment

以下是与线上环境一致的部署思路（Ubuntu + Nginx + PM2）简要步骤。

### 1. 服务器准备

- 操作系统：Ubuntu 22.04 / 24.04 LTS
- 安装 Node.js、Nginx、PM2、MySQL：

```bash
sudo apt update
sudo apt install -y nginx mysql-server git curl
curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo bash -
sudo apt install -y nodejs
sudo npm i -g pm2
```

### 2. 部署后端

```bash
mkdir -p /srv/bookvibe-ai
cd /srv/bookvibe-ai
git clone https://github.com/yourname/BookVibe-AI.git .
npm install --production
cp .env.example .env    # 或者手动创建 .env
# 根据线上数据库 & 讯飞密钥修改 .env
pm2 start app.js --name bookvibe-backend
pm2 save
pm2 startup
```

后端仅暴露在本机端口（如 `127.0.0.1:3000`）。

### 3. 构建前端并托管静态文件

```bash
cd /srv/bookvibe-ai/frontend
npm install
npm run build
```

产物目录：`/srv/bookvibe-ai/frontend/dist`

### 4. 配置 Nginx

新建站点配置，例如 `/etc/nginx/sites-available/bookvibe-ai`：

```nginx
server {
  listen 80;
  server_name huoyaadxijie.cn www.huoyaadxijie.cn;

  root /srv/bookvibe-ai/frontend/dist;
  index index.html;

  location / {
    try_files $uri $uri/ /index.html;
  }

  location /api/ {
    proxy_pass http://127.0.0.1:3000;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```

启用并重启：

```bash
sudo ln -s /etc/nginx/sites-available/bookvibe-ai /etc/nginx/sites-enabled/bookvibe-ai
sudo nginx -t
sudo systemctl restart nginx
```

如需 HTTPS，可进一步使用 `certbot` / `acme.sh` 申请证书配置 `listen 443 ssl`。

---

## 后续优化方向 Roadmap

- **用户体系与多账号支持**
  - 接入注册 / 登录 / 权限控制，让不同用户管理自己的书架与笔记。
- **笔记分享与公开页**
  - 为每条优质笔记生成可分享链接，支持浏览与点赞。
- **富文本与图片支持**
  - 支持为笔记添加简单富文本格式与插图，提高表达力。
- **标签与搜索**
  - 为书籍、笔记增加标签与搜索能力，支持按主题快速检索。
- **更多 AI 能力**
  - 根据笔记生成：思维导图、测试题、阅读计划等衍生内容。
- **国际化（i18n）**
  - 提供中英双语界面，方便国外用户使用。

---

如果你在阅读或部署本项目时遇到任何问题，欢迎提 Issue 或 PR，一起把 **BookVibe-AI / 智享书摘** 打磨成更好用的 AI 读书工具。📖🤝

# BookVibe-AI
A smart reading note platform powered by AI, helping you collect good books, share insights, record thoughts, and generate smart summaries effortlessly.
