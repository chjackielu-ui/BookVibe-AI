const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
require('dotenv').config();

const bookRoutes = require('./routes/books');
const noteRoutes = require('./routes/notes');

const app = express();

// 中间件配置
app.use(cors()); // 解决跨域问题
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// 统一响应封装中间件（可选增强：在控制器中直接返回业务数据）
app.use((req, res, next) => {
  /**
   * 统一成功响应
   * @param {any} data 响应数据
   * @param {string} msg 提示信息
   */
  res.success = (data = null, msg = '操作成功') => {
    res.json({
      code: 200,
      msg,
      data,
    });
  };

  /**
   * 统一失败响应
   * @param {string} msg 错误信息
   * @param {any} data 附加数据
   */
  res.fail = (msg = '操作失败', data = null) => {
    res.status(500).json({
      code: 500,
      msg,
      data,
    });
  };

  next();
});

// 挂载路由
app.use('/api/books', bookRoutes);
app.use('/api/notes', noteRoutes);

// 404 处理
app.use((req, res) => {
  res.status(404).json({
    code: 404,
    msg: '接口不存在',
    data: null,
  });
});

// 全局错误处理中间件（兜底）
app.use((err, req, res, next) => {
  console.error('全局错误捕获：', err);
  res.status(500).json({
    code: 500,
    msg: err.message || '服务器内部错误',
    data: null,
  });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`AI 读书笔记工具后端服务已启动，端口：${PORT}`);
});

