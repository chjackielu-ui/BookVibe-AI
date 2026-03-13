const db = require('../config/db');

/**
 * 获取所有书籍（支持分页）
 * GET /api/books?page=1&size=10
 */
exports.getBooks = async (req, res) => {
  try {
    const page = Number(req.query.page) > 0 ? Number(req.query.page) : 1;
    const size = Number(req.query.size) > 0 ? Number(req.query.size) : 10;
    const offset = (page - 1) * size;

    const totalRows = await db.query('SELECT COUNT(*) AS total FROM books');
    const total = totalRows[0]?.total || 0;

    // 某些 MySQL 版本对 LIMIT 占位符兼容性较差，这里直接拼接已校验的数字以避免报错
    const listSql = `SELECT id, book_name, author, category, create_time 
                     FROM books 
                     ORDER BY create_time DESC 
                     LIMIT ${size} OFFSET ${offset}`;
    const list = await db.query(listSql);

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
    console.error('获取书籍列表失败：', err);
    res.fail(err.message || '获取书籍列表失败', null);
  }
};

/**
 * 新增书籍
 * POST /api/books
 * body: { book_name, author, category }
 */
exports.createBook = async (req, res) => {
  try {
    const { book_name, author = null, category = null } = req.body || {};

    if (!book_name || !String(book_name).trim()) {
      return res.fail('book_name 为必填字段');
    }

    const result = await db.query(
      'INSERT INTO books (book_name, author, category) VALUES (?, ?, ?)',
      [book_name.trim(), author, category]
    );

    res.success({ id: result.insertId }, '新增书籍成功');
  } catch (err) {
    console.error('新增书籍失败：', err);
    res.fail(err.message || '新增书籍失败', null);
  }
};

/**
 * 获取单本书籍详情
 * GET /api/books/:id
 */
exports.getBookById = async (req, res) => {
  try {
    const { id } = req.params;
    const rows = await db.query(
      'SELECT id, book_name, author, category, create_time FROM books WHERE id = ?',
      [id]
    );

    if (!rows.length) {
      return res.fail('书籍不存在');
    }

    res.success(rows[0]);
  } catch (err) {
    console.error('获取书籍详情失败：', err);
    res.fail(err.message || '获取书籍详情失败', null);
  }
};

/**
 * 修改书籍信息
 * PUT /api/books/:id
 * body: { book_name, author, category }
 */
exports.updateBook = async (req, res) => {
  try {
    const { id } = req.params;
    const { book_name, author = null, category = null } = req.body || {};

    if (!book_name || !String(book_name).trim()) {
      return res.fail('book_name 为必填字段');
    }

    const result = await db.query(
      'UPDATE books SET book_name = ?, author = ?, category = ? WHERE id = ?',
      [book_name.trim(), author, category, id]
    );

    if (result.affectedRows === 0) {
      return res.fail('书籍不存在或未修改');
    }

    res.success({ affectedRows: result.affectedRows }, '修改书籍成功');
  } catch (err) {
    console.error('修改书籍失败：', err);
    res.fail(err.message || '修改书籍失败', null);
  }
};

/**
 * 删除书籍（级联删除笔记和 AI 建议）
 * DELETE /api/books/:id
 */
exports.deleteBook = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await db.query('DELETE FROM books WHERE id = ?', [id]);

    if (result.affectedRows === 0) {
      return res.fail('书籍不存在或已被删除');
    }

    // 由于外键约束 ON DELETE CASCADE，会自动级联删除相关笔记和 AI 建议
    res.success({ affectedRows: result.affectedRows }, '删除书籍成功');
  } catch (err) {
    console.error('删除书籍失败：', err);
    res.fail(err.message || '删除书籍失败', null);
  }
};

