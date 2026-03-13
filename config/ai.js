const axios = require('axios');

/**
 * 星火大模型 HTTP 接口封装
 * 文档参考：`https://spark-api-open.xf-yun.com/v1/chat/completions`
 *
 * 环境变量：
 * - SPARK_API_BASE：可选，默认 https://spark-api-open.xf-yun.com/v1
 * - SPARK_API_KEY：必填，对应控制台获取的 APIPassword（不要填 APPID / APIKey / APISecret）
 * - SPARK_MODEL：可选，默认 generalv3.5（Spark Pro）
 */

const SPARK_API_BASE =
  process.env.SPARK_API_BASE || 'https://spark-api-open.xf-yun.com/v1';
const SPARK_API_KEY = process.env.SPARK_API_KEY;
const SPARK_MODEL = process.env.SPARK_MODEL || 'generalv3.5';

if (!SPARK_API_KEY) {
  // 不直接抛出错误，留给调用方处理「未配置」情况
  console.warn(
    '[SparkAI] 未检测到 SPARK_API_KEY 环境变量，将无法真正调用星火大模型。'
  );
}

const client = axios.create({
  baseURL: SPARK_API_BASE,
  timeout: 20_000,
});

/**
 * 调用星火大模型，为读书笔记生成：
 * - aiSummary：精华总结
 * - aiFeeling：读后感优化建议
 * - aiRecommend：拓展阅读推荐（格式：书名1,理由1;书名2,理由2）
 *
 * @param {Object} options
 * @param {Object} options.note - 笔记数据（含 excerpt / feeling / ai_summary 等）
 * @param {Object} options.book - 书籍数据（含 book_name / author / category 等）
 * @returns {Promise<{ aiSummary: string, aiFeeling: string, aiRecommend: string }>}
 */
async function generateFromSpark({ note, book }) {
  if (!SPARK_API_KEY) {
    throw new Error(
      '后端未配置 SPARK_API_KEY 环境变量，无法调用星火大模型。'
    );
  }

  const systemPrompt =
    '你是一名专业的读书笔记整理助手，擅长根据书籍原文摘抄和读者感受，' +
    '提炼精华总结、优化读后感，并推荐适合的延伸阅读书籍。' +
    '务必按照要求输出 JSON，对中文读者友好、文字简洁、有温度。';

  const userPrompt = `
【书籍信息】
- 书名：${book?.book_name || '（未知书名）'}
- 作者：${book?.author || '（未知作者）'}
- 类型：${book?.category || '（未分类）'}

【原文摘抄】
${note?.excerpt || '（无摘抄内容）'}

【读者个人感悟】
${note?.feeling || '（用户暂未填写感悟，如有必要你可以适度补充可能的思考角度）'}

请严格按照下面 JSON 格式输出（不要添加多余说明文字）：
{
  "aiSummary": "不超过 3 段的中文总结，突出这段内容的核心观点与启发。",
  "aiFeeling": "在尊重原始感受的基础上，帮用户润色与扩展读后感，语言真诚、具体。",
  "aiRecommend": "推荐 2-3 本相关书籍，格式形如：书名1,理由1;书名2,理由2"
}`;

  const payload = {
    model: SPARK_MODEL,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    temperature: 0.7,
    top_k: 4,
    stream: false,
    max_tokens: 1024,
    response_format: {
      type: 'json_object',
    },
  };

  const headers = {
    Authorization: `Bearer ${SPARK_API_KEY}`,
    'Content-Type': 'application/json',
  };

  const res = await client.post('/chat/completions', payload, { headers });
  const data = res.data;

  if (data.code !== 0) {
    throw new Error(
      `星火接口返回错误：code=${data.code}, message=${data.message || ''}`
    );
  }

  const content =
    data.choices?.[0]?.message?.content ||
    data.choices?.[0]?.delta?.content ||
    '';

  if (!content) {
    throw new Error('星火接口未返回内容');
  }

  // 星火可能返回 ```json ... ``` 包裹的内容，需先剥离
  let raw = content.trim();
  if (raw.startsWith('```')) {
    raw = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim();
  }

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    throw new Error('星火返回内容不是合法 JSON：' + e.message);
  }

  return {
    aiSummary: String(parsed.aiSummary || '').trim(),
    aiFeeling: String(parsed.aiFeeling || '').trim(),
    aiRecommend: String(parsed.aiRecommend || '').trim(),
  };
}

module.exports = {
  generateFromSpark,
};

