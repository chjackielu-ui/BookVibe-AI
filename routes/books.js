const express = require('express');
const router = express.Router();
const bookController = require('../controllers/bookController');

// 书籍管理路由

// 获取所有书籍（支持分页）
router.get('/', bookController.getBooks);

// 新增书籍
router.post('/', bookController.createBook);

// 获取单本书籍详情
router.get('/:id', bookController.getBookById);

// 修改书籍信息
router.put('/:id', bookController.updateBook);

// 删除书籍（级联删笔记和 AI 建议）
router.delete('/:id', bookController.deleteBook);

module.exports = router;

