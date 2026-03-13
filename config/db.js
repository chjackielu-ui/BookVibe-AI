const mysql = require('mysql2/promise');

// 数据库配置（根据题目要求固定配置，也支持从环境变量覆盖）
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '123456',
  database: process.env.DB_NAME || 'ai_reading_note',
  charset: 'utf8mb4',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

/**
 * 通用查询方法
 * @param {string} sql SQL 语句
 * @param {Array<any>} params 参数数组
 * @returns {Promise<any>} 查询结果
 */
async function query(sql, params = []) {
  const [rows] = await pool.execute(sql, params);
  return rows;
}

module.exports = {
  pool,
  query,
};

