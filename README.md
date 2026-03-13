# AI 读书笔记工具后端（Express + MySQL）

本项目为「AI 读书笔记工具」提供后端 RESTful API 服务。

## 1. 技术栈与约定

- **Node.js**：后端运行环境
- **Express**：Web 框架（端口 **3000**）
- **MySQL**：数据库（`ai_reading_note`）
- **mysql2/promise**：连接池与查询
- **cors**：跨域中间件（已在 `app.js` 启用）
- **统一返回结构**：

```json
{
  "code": 200,
  "msg": "操作成功",
  "data": {}
}
```

说明：
- **code=200**：成功
- **code=500**：失败（`msg` 为错误信息，`data` 为 `null`）

## 2. 项目结构

```text
.
├── package.json
├── app.js
├── config/
│   └── db.js
├── routes/
│   ├── books.js
│   └── notes.js
└── controllers/
    ├── bookController.js
    └── noteController.js
```

## 3. 环境准备

### 3.1 安装 Node.js

建议使用 **Node.js LTS** 版本。

### 3.2 准备 MySQL 并创建库表

数据库配置（默认写在 `config/db.js`，可用环境变量覆盖）：
- host：`localhost`
- port：`3306`
- user：`root`
- password：`123456`
- database：`ai_reading_note`
- charset：`utf8mb4`

在 MySQL 客户端执行以下 SQL（题目提供的建库建表脚本）：

```sql
-- 创建数据库
CREATE DATABASE IF NOT EXISTS ai_reading_note 
DEFAULT CHARACTER SET utf8mb4
DEFAULT COLLATE utf8mb4_general_ci;

USE ai_reading_note;

-- 1. 书籍表
CREATE TABLE IF NOT EXISTS books (
    id INT(11) NOT NULL AUTO_INCREMENT COMMENT '书籍唯一标识，自增主键',
    book_name VARCHAR(100) NOT NULL COMMENT '书籍名称（必填）',
    author VARCHAR(50) DEFAULT NULL COMMENT '书籍作者（选填）',
    category VARCHAR(30) DEFAULT NULL COMMENT '书籍类型（如小说/科普/职场等）',
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '书籍添加时间（自动生成）',
    PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='书籍基础信息表';

-- 2. 读书笔记表
CREATE TABLE IF NOT EXISTS reading_notes (
    id INT(11) NOT NULL AUTO_INCREMENT COMMENT '读书笔记唯一标识，自增主键',
    book_id INT(11) NOT NULL COMMENT '关联书籍表的主键ID',
    excerpt TEXT NOT NULL COMMENT '书籍原文摘抄（必填）',
    feeling TEXT DEFAULT NULL COMMENT '用户个人感悟（选填）',
    ai_summary TEXT DEFAULT NULL COMMENT 'AI生成的笔记精华总结',
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '读书笔记创建时间（自动生成）',
    PRIMARY KEY (id),
    FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户读书笔记表';

-- 3. AI拓展建议表
CREATE TABLE IF NOT EXISTS ai_suggestions (
    id INT(11) NOT NULL AUTO_INCREMENT COMMENT 'AI建议唯一标识，自增主键',
    note_id INT(11) NOT NULL COMMENT '关联读书笔记表的主键ID',
    ai_feeling TEXT DEFAULT NULL COMMENT 'AI生成的读后感优化建议',
    ai_recommend VARCHAR(200) DEFAULT NULL COMMENT 'AI推荐的拓展阅读书籍（格式：书籍1,理由1;书籍2,理由2）',
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'AI建议生成/更新时间（自动更新）',
    PRIMARY KEY (id),
    FOREIGN KEY (note_id) REFERENCES reading_notes(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='AI生成的拓展建议表';
```

### 3.3（可选）使用环境变量覆盖数据库配置

在项目根目录新建 `.env`（可选）：

```bash
PORT=3000
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=123456
DB_NAME=ai_reading_note
```

## 4. 安装与启动

进入项目目录后执行：

```bash
npm install
npm start
```

启动成功会看到：

```text
AI 读书笔记工具后端服务已启动，端口：3000
```

基础地址：
- `http://localhost:3000`

健康检查（非专门接口）：打开 `http://localhost:3000/` 会返回 404 JSON，表示服务在运行。

## 5. API 接口清单

### 5.1 书籍管理（`/api/books`）

- **GET** `/api/books`：获取所有书籍（分页）
  - query：`page`(默认1)、`size`(默认10)
- **POST** `/api/books`：新增书籍
  - body：`book_name`(必填)、`author`、`category`
- **GET** `/api/books/:id`：获取单本书籍详情
- **PUT** `/api/books/:id`：修改书籍信息
  - body：`book_name`(必填)、`author`、`category`
- **DELETE** `/api/books/:id`：删除书籍（级联删笔记和 AI 建议）

### 5.2 读书笔记管理（`/api/notes`）

- **GET** `/api/notes`：获取笔记列表（可按书籍筛选 + 分页）
  - query：`book_id`(可选)、`page`、`size`
- **POST** `/api/notes`：新增读书笔记
  - body：`book_id`(必填)、`excerpt`(必填)、`feeling`
- **GET** `/api/notes/:id`：获取单条笔记详情（含 AI 建议）
- **PUT** `/api/notes/:id`：修改笔记内容
  - body：`excerpt`、`feeling`
- **DELETE** `/api/notes/:id`：删除笔记（级联删 AI 建议）

### 5.3 AI 建议（`/api/notes`）

- **POST** `/api/notes/:id/generate-ai`：为指定笔记生成 AI 建议
- **GET** `/api/notes/:id/ai-suggestions`：获取指定笔记的 AI 建议

> 说明：`generate-ai` 内部 **已预留**调用 AI 的位置：
> `// 待实现：调用AI接口生成总结、读后感建议和拓展阅读推荐，由我手动补充`

## 6. 使用 Postman 逐个接口测试（详细步骤）

下面示例默认你的后端已启动在：`http://localhost:3000`

### 6.1 Postman 基础设置

1. 打开 Postman
2. 点击左上角 **New** → 选择 **Collection**，命名为 `AI Reading Note Backend`
3. （推荐）在 Collection 中添加变量：
   - `baseUrl` = `http://localhost:3000`
4. 后续请求 URL 可写成：`{{baseUrl}}/api/books` 这种形式，方便切换环境

### 6.2 书籍接口测试流程

#### 6.2.1 新增书籍（POST `/api/books`）

1. New → HTTP Request
2. Method 选 **POST**
3. URL：`{{baseUrl}}/api/books`
4. 点击 **Body** → 选择 **raw** → 右侧选择 **JSON**
5. 填入：

```json
{
  "book_name": "原则",
  "author": "Ray Dalio",
  "category": "职场"
}
```

6. 点击 **Send**
7. 记录返回的 `data.id`（例如 `1`），后续接口会用到

#### 6.2.2 获取书籍列表（GET `/api/books`）

1. Method 选 **GET**
2. URL：`{{baseUrl}}/api/books?page=1&size=10`
3. Send

#### 6.2.3 获取单本书籍详情（GET `/api/books/:id`）

1. Method 选 **GET**
2. URL：`{{baseUrl}}/api/books/1`（把 `1` 替换为你的书籍 id）
3. Send

#### 6.2.4 修改书籍（PUT `/api/books/:id`）

1. Method 选 **PUT**
2. URL：`{{baseUrl}}/api/books/1`
3. Body → raw → JSON：

```json
{
  "book_name": "原则（修订版）",
  "author": "Ray Dalio",
  "category": "职场"
}
```

4. Send

#### 6.2.5 删除书籍（DELETE `/api/books/:id`）

1. Method 选 **DELETE**
2. URL：`{{baseUrl}}/api/books/1`
3. Send

> 注意：删除书籍会通过外键 `ON DELETE CASCADE` **级联删除**该书下的笔记与 AI 建议。

### 6.3 笔记接口测试流程

#### 6.3.1 新增笔记（POST `/api/notes`）

前提：你已经创建了书籍，拿到 `book_id`。

1. Method 选 **POST**
2. URL：`{{baseUrl}}/api/notes`
3. Body → raw → JSON：

```json
{
  "book_id": 1,
  "excerpt": "痛苦 + 反思 = 进步。",
  "feeling": "这句话适合用来做复盘。"
}
```

4. Send
5. 记录返回的 `data.id`（note_id，例如 `1`）

#### 6.3.2 获取笔记列表（GET `/api/notes`）

- 全部笔记：
  - URL：`{{baseUrl}}/api/notes?page=1&size=10`
- 按书籍筛选：
  - URL：`{{baseUrl}}/api/notes?book_id=1&page=1&size=10`

#### 6.3.3 获取单条笔记详情（GET `/api/notes/:id`）

1. Method：GET
2. URL：`{{baseUrl}}/api/notes/1`
3. Send

返回里包含：
- `data.note`：笔记详情
- `data.aiSuggestions`：该笔记下 AI 建议（可能为空数组）

#### 6.3.4 修改笔记（PUT `/api/notes/:id`）

1. Method：PUT
2. URL：`{{baseUrl}}/api/notes/1`
3. Body → raw → JSON（改 excerpt 或 feeling 任意一个即可）：

```json
{
  "excerpt": "痛苦 + 反思 = 进步（更新）",
  "feeling": "更新一下我的理解。"
}
```

4. Send

#### 6.3.5 删除笔记（DELETE `/api/notes/:id`）

1. Method：DELETE
2. URL：`{{baseUrl}}/api/notes/1`
3. Send

> 注意：删除笔记会通过外键 `ON DELETE CASCADE` **级联删除**该笔记的 AI 建议。

### 6.4 AI 建议接口测试流程

#### 6.4.1 生成 AI 建议（POST `/api/notes/:id/generate-ai`）

1. Method：POST
2. URL：`{{baseUrl}}/api/notes/1/generate-ai`
3. Send

说明：
- 当前接口实现为 **占位**：会写入 `ai_summary` 和 `ai_suggestions` 的占位内容
- 你后续只需要在控制器里把占位内容替换为真实 AI 接口返回即可

#### 6.4.2 获取 AI 建议（GET `/api/notes/:id/ai-suggestions`）

1. Method：GET
2. URL：`{{baseUrl}}/api/notes/1/ai-suggestions`
3. Send

## 7. 常见问题

### 7.1 PowerShell 执行 npm 报 “running scripts is disabled”

这是 PowerShell 执行策略问题，可执行以下其一解决：

（推荐）仅对当前用户放开：

```powershell
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
```

或仅对当前终端会话临时放开：

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
```

---

如需我帮你导出 Postman Collection（json）也可以继续说，我可以按当前接口清单帮你生成。

