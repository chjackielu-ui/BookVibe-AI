const db = require('../config/db');
const sparkAI = require('../config/ai');

/**
 * 获取笔记列表（支持按书籍筛选 + 分页）
 * GET /api/notes?book_id=&page=&size=
 */
exports.getNotes = async (req, res) => {
  try {
    const page = Number(req.query.page) > 0 ? Number(req.query.page) : 1;
    const size = Number(req.query.size) > 0 ? Number(req.query.size) : 10;
    const offset = (page - 1) * size;
    const { book_id } = req.query;

    let whereSql = '1=1';
    const params = [];
    const countParams = [];

    if (book_id) {
      whereSql += ' AND rn.book_id = ?';
      params.push(book_id);
      countParams.push(book_id);
    }

    const totalRows = await db.query(
      `SELECT COUNT(*) AS total FROM reading_notes rn WHERE ${whereSql.replace('rn.', '')}`,
      countParams
    );
    const total = totalRows[0]?.total || 0;

    const listSql = `SELECT 
         rn.id,
         rn.book_id,
         b.book_name,
         b.author,
         rn.excerpt,
         rn.feeling,
         rn.ai_summary,
         rn.create_time
       FROM reading_notes rn
       LEFT JOIN books b ON rn.book_id = b.id
       WHERE ${whereSql}
       ORDER BY rn.create_time DESC
       LIMIT ${size} OFFSET ${offset}`;
    const list = await db.query(listSql, params);

    res.success({
      list,
      pagination: {
        total,
        page,
        size,
        totalPages: Math.ceil(total / size) || 0,
      },
    });
  } catch (err) {
    console.error('获取笔记列表失败：', err);
    res.fail(err.message || '获取笔记列表失败', null);
  }
};

/**
 * 新增读书笔记
 * POST /api/notes
 * body: { book_id, excerpt, feeling }
 */
exports.createNote = async (req, res) => {
  try {
    const { book_id, excerpt, feeling = null } = req.body || {};

    if (!book_id) {
      return res.fail('book_id 为必填字段');
    }
    if (!excerpt || !String(excerpt).trim()) {
      return res.fail('excerpt 为必填字段');
    }

    // 校验书籍是否存在
    const bookRows = await db.query('SELECT id FROM books WHERE id = ?', [
      book_id,
    ]);
    if (!bookRows.length) {
      return res.fail('关联书籍不存在');
    }

    const result = await db.query(
      'INSERT INTO reading_notes (book_id, excerpt, feeling) VALUES (?, ?, ?)',
      [book_id, excerpt, feeling]
    );

    res.success({ id: result.insertId }, '新增读书笔记成功');
  } catch (err) {
    console.error('新增读书笔记失败：', err);
    res.fail(err.message || '新增读书笔记失败', null);
  }
};

/**
 * 获取单条笔记详情（含 AI 建议）
 * GET /api/notes/:id
 */
exports.getNoteById = async (req, res) => {
  try {
    const { id } = req.params;

    const noteRows = await db.query(
      `SELECT 
         rn.id,
         rn.book_id,
         b.book_name,
         b.author,
         rn.excerpt,
         rn.feeling,
         rn.ai_summary,
         rn.create_time
       FROM reading_notes rn
       LEFT JOIN books b ON rn.book_id = b.id
       WHERE rn.id = ?`,
      [id]
    );

    if (!noteRows.length) {
      return res.fail('读书笔记不存在');
    }

    const suggestionRows = await db.query(
      `SELECT 
         id,
         note_id,
         ai_feeling,
         ai_recommend,
         update_time
       FROM ai_suggestions
       WHERE note_id = ?
       ORDER BY update_time DESC`,
      [id]
    );

    res.success({
      note: noteRows[0],
      aiSuggestions: suggestionRows,
    });
  } catch (err) {
    console.error('获取读书笔记详情失败：', err);
    res.fail(err.message || '获取读书笔记详情失败', null);
  }
};

/**
 * 修改笔记内容
 * PUT /api/notes/:id
 * body: { excerpt, feeling }
 */
exports.updateNote = async (req, res) => {
  try {
    const { id } = req.params;
    const { excerpt, feeling } = req.body || {};

    if (!excerpt && feeling === undefined) {
      return res.fail('至少需要提供 excerpt 或 feeling 字段');
    }

    const fields = [];
    const params = [];

    if (excerpt !== undefined) {
      if (!String(excerpt).trim()) {
        return res.fail('excerpt 不能为空字符串');
      }
      fields.push('excerpt = ?');
      params.push(excerpt);
    }

    if (feeling !== undefined) {
      fields.push('feeling = ?');
      params.push(feeling);
    }

    params.push(id);

    const result = await db.query(
      `UPDATE reading_notes SET ${fields.join(', ')} WHERE id = ?`,
      params
    );

    if (result.affectedRows === 0) {
      return res.fail('读书笔记不存在或未修改');
    }

    res.success({ affectedRows: result.affectedRows }, '修改读书笔记成功');
  } catch (err) {
    console.error('修改读书笔记失败：', err);
    res.fail(err.message || '修改读书笔记失败', null);
  }
};

/**
 * 删除笔记（级联删 AI 建议）
 * DELETE /api/notes/:id
 */
exports.deleteNote = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await db.query('DELETE FROM reading_notes WHERE id = ?', [
      id,
    ]);

    if (result.affectedRows === 0) {
      return res.fail('读书笔记不存在或已被删除');
    }

    // 外键 ON DELETE CASCADE，会自动删除 ai_suggestions 记录
    res.success({ affectedRows: result.affectedRows }, '删除读书笔记成功');
  } catch (err) {
    console.error('删除读书笔记失败：', err);
    res.fail(err.message || '删除读书笔记失败', null);
  }
};

/**
 * 为指定笔记生成 AI 建议（接入星火大模型 HTTP 接口）
 * POST /api/notes/:id/generate-ai
 * 返回：生成后的 AI 建议数据
 */
exports.generateAiSuggestions = async (req, res) => {
  try {
    const { id } = req.params;

    // 查询笔记及其关联书籍信息，便于调用 AI 接口生成内容
    const noteRows = await db.query(
      `SELECT 
         rn.id,
         rn.book_id,
         b.book_name,
         b.author,
         b.category,
         rn.excerpt,
         rn.feeling,
         rn.ai_summary
       FROM reading_notes rn
       LEFT JOIN books b ON rn.book_id = b.id
       WHERE rn.id = ?`,
      [id]
    );

    if (!noteRows.length) {
      return res.fail('读书笔记不存在，无法生成 AI 建议');
    }

    const note = noteRows[0];

    let aiSummary = note.ai_summary || '';
    let aiFeeling = '';
    let aiRecommend = '';

    try {
      // 调用星火大模型生成总结、读后感建议和拓展阅读推荐
      const aiResult = await sparkAI.generateFromSpark({
        note,
        book: {
          book_name: note.book_name,
          author: note.author,
          category: note.category,
        },
      });
      aiSummary = aiResult.aiSummary || aiSummary;
      aiFeeling = aiResult.aiFeeling || '';
      aiRecommend = aiResult.aiRecommend || '';
    } catch (aiErr) {
      console.error('调用星火大模型失败，将回退为占位内容：', aiErr);
      if (!aiSummary) {
        aiSummary = '（AI 总结暂未生成，稍后可重试或检查大模型配置）';
      }
      aiFeeling =
        '（AI 建议暂未生成，稍后可重试或检查大模型配置，亦可自行撰写读后感）';
      aiRecommend =
        '（AI 推荐暂未生成，可自行根据主题补充相关书单，例如：书名1,理由1;书名2,理由2）';
    }

    // 更新 reading_notes.ai_summary
    await db.query('UPDATE reading_notes SET ai_summary = ? WHERE id = ?', [
      aiSummary,
      id,
    ]);

    // 查询是否已有 AI 建议，存在则更新，不存在则插入
    const existRows = await db.query(
      'SELECT id FROM ai_suggestions WHERE note_id = ?',
      [id]
    );

    let suggestionId;

    if (existRows.length) {
      suggestionId = existRows[0].id;
      await db.query(
        'UPDATE ai_suggestions SET ai_feeling = ?, ai_recommend = ? WHERE id = ?',
        [aiFeeling, aiRecommend, suggestionId]
      );
    } else {
      const insertResult = await db.query(
        'INSERT INTO ai_suggestions (note_id, ai_feeling, ai_recommend) VALUES (?, ?, ?)',
        [id, aiFeeling, aiRecommend]
      );
      suggestionId = insertResult.insertId;
    }

    const suggestionRows = await db.query(
      `SELECT 
         id,
         note_id,
         ai_feeling,
         ai_recommend,
         update_time
       FROM ai_suggestions
       WHERE id = ?`,
      [suggestionId]
    );

    res.success(
      {
        noteId: Number(id),
        aiSummary,
        suggestion: suggestionRows[0] || null,
      },
      'AI 建议生成成功'
    );
  } catch (err) {
    console.error('生成 AI 建议失败：', err);
    res.fail(err.message || '生成 AI 建议失败', null);
  }
};

/**
 * 获取指定笔记的 AI 建议
 * GET /api/notes/:id/ai-suggestions
 */
exports.getAiSuggestionsByNoteId = async (req, res) => {
  try {
    const { id } = req.params;

    const suggestionRows = await db.query(
      `SELECT 
         id,
         note_id,
         ai_feeling,
         ai_recommend,
         update_time
       FROM ai_suggestions
       WHERE note_id = ?
       ORDER BY update_time DESC`,
      [id]
    );

    res.success({
      noteId: Number(id),
      suggestions: suggestionRows,
    });
  } catch (err) {
    console.error('获取 AI 建议失败：', err);
    res.fail(err.message || '获取 AI 建议失败', null);
  }
};

