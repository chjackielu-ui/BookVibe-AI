const express = require('express');
const router = express.Router();
const noteController = require('../controllers/noteController');

// 笔记管理 + AI 建议路由

// 获取笔记列表（支持按书籍筛选 + 分页）
router.get('/', noteController.getNotes);

// 新增读书笔记
router.post('/', noteController.createNote);

// 获取单条笔记详情（含 AI 建议）
router.get('/:id', noteController.getNoteById);

// 修改笔记内容
router.put('/:id', noteController.updateNote);

// 删除笔记（级联删 AI 建议）
router.delete('/:id', noteController.deleteNote);

// 为指定笔记生成 AI 建议
router.post('/:id/generate-ai', noteController.generateAiSuggestions);

// 获取指定笔记的 AI 建议
router.get('/:id/ai-suggestions', noteController.getAiSuggestionsByNoteId);

module.exports = router;

