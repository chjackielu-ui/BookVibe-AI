<script setup>
import { ref, onMounted, onBeforeUnmount, watch, computed } from 'vue';
import axios from 'axios';

const loadingBooks = ref(false);
const creatingNote = ref(false);
const generatingAi = ref(false);

const books = ref([]);
const selectedBookId = ref('');
const selectedBook = ref(null);

const excerpt = ref('');
const feeling = ref('');

// 是否在创建笔记时同时生成 AI 建议（可选）
const generateAiOnCreate = ref(true);

const latestResponse = ref(null);
const statusText = ref('等待操作');
const statusError = ref(false);

// 当前选中书籍的全部笔记
const notesForBook = ref([]);
const loadingNotes = ref(false);

// 已展开的笔记 ID（用于查看全文）
const expandedNoteId = ref(null);
// 单条笔记详情（含 AI 建议）
const noteDetailCache = ref({});

// 收藏（置顶）笔记 ID 列表（本地存储）
const FAVORITE_KEY = 'ai-reading-favorite-notes';
const favoriteNoteIds = ref([]);
const deletingNoteId = ref(null);

// 新建书籍表单
const newBookName = ref('');
const newBookAuthor = ref('');
const newBookCategory = ref('');
const creatingBook = ref(false);

// 折叠状态：节省空间
const collapseNewBook = ref(true);
const collapseBookList = ref(false);

// 主题
const themeMode = ref('auto');
const currentTheme = ref('light');
let themeTimer = null;
const THEME_KEY = 'ai-reading-note-theme-mode';

function getAutoTheme() {
  const hour = new Date().getHours();
  return hour >= 6 && hour < 18 ? 'light' : 'dark';
}
function applyTheme(theme) {
  currentTheme.value = theme;
  document.documentElement.setAttribute('data-theme', theme);
}
function setupAutoTimer() {
  if (themeTimer) clearInterval(themeTimer);
  themeTimer = setInterval(() => {
    if (themeMode.value !== 'auto') return;
    const next = getAutoTheme();
    if (next !== currentTheme.value) applyTheme(next);
  }, 60 * 1000);
}
function initTheme() {
  const saved = localStorage.getItem(THEME_KEY);
  if (saved === 'light' || saved === 'dark' || saved === 'auto') themeMode.value = saved;
  if (themeMode.value === 'auto') {
    applyTheme(getAutoTheme());
    setupAutoTimer();
  } else {
    applyTheme(themeMode.value);
  }
}
function onThemeChange(e) {
  const mode = e.target.value;
  themeMode.value = mode;
  localStorage.setItem(THEME_KEY, mode);
  if (mode === 'auto') {
    applyTheme(getAutoTheme());
    setupAutoTimer();
  } else {
    if (themeTimer) clearInterval(themeTimer);
    applyTheme(mode);
  }
}

async function fetchBooks() {
  loadingBooks.value = true;
  statusError.value = false;
  statusText.value = '正在获取书籍列表…';
  try {
    const res = await axios.get('/api/books', { params: { page: 1, size: 50 } });
    latestResponse.value = res.data;
    if (res.data.code === 200) {
      books.value = res.data.data.list || [];
      if (!selectedBookId.value && books.value.length) {
        selectedBookId.value = String(books.value[0].id);
      }
      statusText.value = `成功获取 ${books.value.length} 本书籍`;
      // 书籍列表更新后，立即刷新右侧该书的笔记
      if (selectedBookId.value) {
        await fetchNotesForBook(selectedBookId.value);
      }
    } else {
      statusError.value = true;
      statusText.value = `获取书籍失败：${res.data.msg}`;
    }
  } catch (err) {
    statusError.value = true;
    statusText.value = `请求出错：${err.message}`;
    latestResponse.value = err.response?.data || null;
  } finally {
    loadingBooks.value = false;
  }
}

// 选中书籍时自动获取该书的全部笔记
async function fetchNotesForBook(bookId) {
  if (!bookId) {
    notesForBook.value = [];
    selectedBook.value = null;
    return;
  }
  loadingNotes.value = true;
  try {
    const res = await axios.get('/api/notes', {
      params: { book_id: bookId, page: 1, size: 50 },
    });
    if (res.data.code === 200) {
      notesForBook.value = res.data.data?.list || [];
      selectedBook.value = books.value.find((b) => String(b.id) === bookId) || null;
    }
  } catch (err) {
    notesForBook.value = [];
  } finally {
    loadingNotes.value = false;
  }
}

// 加载 / 保存收藏列表
function loadFavorites() {
  try {
    const raw = localStorage.getItem(FAVORITE_KEY);
    if (!raw) return;
    const arr = JSON.parse(raw);
    if (Array.isArray(arr)) {
      favoriteNoteIds.value = arr.map((x) => Number(x)).filter((x) => !Number.isNaN(x));
    }
  } catch (e) {
    favoriteNoteIds.value = [];
  }
}
function saveFavorites() {
  localStorage.setItem(FAVORITE_KEY, JSON.stringify(favoriteNoteIds.value));
}
function isFavorite(id) {
  return favoriteNoteIds.value.includes(id);
}
function toggleFavorite(note) {
  const id = note.id;
  if (!id) return;
  if (isFavorite(id)) {
    favoriteNoteIds.value = favoriteNoteIds.value.filter((n) => n !== id);
  } else {
    favoriteNoteIds.value = [id, ...favoriteNoteIds.value.filter((n) => n !== id)];
  }
  saveFavorites();
}

// 笔记排序：收藏置顶，其余按创建时间倒序
const sortedNotesForBook = computed(() => {
  const ids = new Set(favoriteNoteIds.value);
  return [...notesForBook.value].sort((a, b) => {
    const af = ids.has(a.id);
    const bf = ids.has(b.id);
    if (af && !bf) return -1;
    if (!af && bf) return 1;
    const at = new Date(a.create_time || 0).getTime();
    const bt = new Date(b.create_time || 0).getTime();
    return bt - at;
  });
});

// 获取单条笔记详情（含 AI 建议）
async function fetchNoteDetail(noteId) {
  if (noteDetailCache.value[noteId]) return noteDetailCache.value[noteId];
  try {
    const res = await axios.get(`/api/notes/${noteId}`);
    if (res.data.code === 200 && res.data.data) {
      noteDetailCache.value[noteId] = res.data.data;
      return res.data.data;
    }
  } catch (err) {
    return null;
  }
  return null;
}

function toggleNoteExpand(noteId) {
  if (expandedNoteId.value === noteId) {
    expandedNoteId.value = null;
    return;
  }
  expandedNoteId.value = noteId;
  fetchNoteDetail(noteId);
}

async function createBook() {
  if (!newBookName.value.trim()) {
    statusError.value = true;
    statusText.value = '请先填写书名';
    return;
  }
  creatingBook.value = true;
  statusError.value = false;
  statusText.value = '正在创建新书籍…';
  try {
    const res = await axios.post('/api/books', {
      book_name: newBookName.value.trim(),
      author: newBookAuthor.value || null,
      category: newBookCategory.value || null,
    });
    latestResponse.value = res.data;
    if (res.data.code !== 200) {
      statusError.value = true;
      statusText.value = `创建书籍失败：${res.data.msg}`;
      return;
    }
    statusText.value = '新书籍创建成功';
    newBookName.value = '';
    newBookAuthor.value = '';
    newBookCategory.value = '';
    await fetchBooks();
    const newId = res.data.data?.id;
    if (newId) selectedBookId.value = String(newId);
  } catch (err) {
    statusError.value = true;
    statusText.value = `创建书籍出错：${err.message}`;
    latestResponse.value = err.response?.data || null;
  } finally {
    creatingBook.value = false;
  }
}

async function createNote() {
  if (!selectedBookId.value) {
    statusError.value = true;
    statusText.value = '请先选择书籍';
    return;
  }
  if (!excerpt.value.trim()) {
    statusError.value = true;
    statusText.value = '请先填写「原文摘抄」';
    return;
  }

  creatingNote.value = true;
  generatingAi.value = false;
  statusError.value = false;
  statusText.value = '正在创建读书笔记…';

  try {
    const createRes = await axios.post('/api/notes', {
      book_id: Number(selectedBookId.value),
      excerpt: excerpt.value,
      feeling: feeling.value || null,
    });
    latestResponse.value = createRes.data;
    if (createRes.data.code !== 200) {
      statusError.value = true;
      statusText.value = `创建笔记失败：${createRes.data.msg}`;
      return;
    }

    const noteId = createRes.data.data.id;

    if (generateAiOnCreate.value) {
      statusText.value = `笔记已创建，正在生成 AI 建议…`;
      generatingAi.value = true;
      const aiRes = await axios.post(`/api/notes/${noteId}/generate-ai`);
      latestResponse.value = aiRes.data;
      if (aiRes.data.code === 200) {
        statusText.value = '笔记已创建，AI 建议已生成';
      } else {
        statusText.value = `笔记已创建，AI 建议生成失败：${aiRes.data.msg}`;
      }
    } else {
      statusText.value = '笔记创建成功';
    }

    excerpt.value = '';
    feeling.value = '';
    noteDetailCache.value = {};
    await fetchNotesForBook(selectedBookId.value);
  } catch (err) {
    statusError.value = true;
    statusText.value = `请求出错：${err.message}`;
    latestResponse.value = err.response?.data || null;
  } finally {
    creatingNote.value = false;
    generatingAi.value = false;
  }
}

// 删除笔记
async function deleteNote(noteId) {
  if (!noteId) return;
  const confirmText = '确定要删除这条笔记吗？该操作不可恢复。';
  if (!window.confirm(confirmText)) return;

  deletingNoteId.value = noteId;
  statusError.value = false;
  statusText.value = '正在删除笔记…';

  try {
    const res = await axios.delete(`/api/notes/${noteId}`);
    latestResponse.value = res.data;
    if (res.data.code !== 200) {
      statusError.value = true;
      statusText.value = `删除失败：${res.data.msg}`;
      return;
    }
    // 前端状态同步
    notesForBook.value = notesForBook.value.filter((n) => n.id !== noteId);
    delete noteDetailCache.value[noteId];
    favoriteNoteIds.value = favoriteNoteIds.value.filter((n) => n !== noteId);
    saveFavorites();
    if (expandedNoteId.value === noteId) expandedNoteId.value = null;
    statusText.value = '笔记已删除';
  } catch (err) {
    statusError.value = true;
    statusText.value = `删除出错：${err.message}`;
  } finally {
    deletingNoteId.value = null;
  }
}

watch(
  selectedBookId,
  (id) => {
    fetchNotesForBook(id);
  },
  { immediate: true }
);

onMounted(() => {
  initTheme();
  loadFavorites();
  fetchBooks();
});

onBeforeUnmount(() => {
  if (themeTimer) clearInterval(themeTimer);
});
</script>

<template>
  <div class="app-shell">
    <header class="app-header">
      <div class="app-hero">
        <div class="app-hero-bg" aria-hidden="true">智享书摘</div>
        <div class="app-hero-fg">
          <div class="app-title-main">智享书摘</div>
          <div class="app-title-sub">AI 驱动的读书笔记共享平台</div>
          <div class="app-title-slogan">智读好书，共享心得，记录每一份触动。</div>
          <div class="app-title-intro">
            智享书摘是一款集书籍管理、读书笔记、AI 智能总结、心得共享于一体的 Web 应用。用
            AI 提炼书中精华，用笔记记录真实感受，与他人共享优质好书与思想。
          </div>
        </div>
      </div>
      <div class="badge">
        主题：
        <select class="select" :value="themeMode" @change="onThemeChange">
          <option value="auto">自动（06:00 / 18:00）</option>
          <option value="light">白天</option>
          <option value="dark">夜间</option>
        </select>
      </div>
    </header>

    <main class="app-main">
      <!-- 左侧 -->
      <section class="panel">
        <div class="collapse-header" @click="collapseNewBook = !collapseNewBook">
          <span class="collapse-icon">{{ collapseNewBook ? '▶' : '▼' }}</span>
          <span>新建书籍</span>
        </div>
        <div v-show="!collapseNewBook" class="collapse-body">
          <input v-model="newBookName" class="input" type="text" placeholder="书名（必填）" />
          <div class="btn-row">
            <input v-model="newBookAuthor" class="input" placeholder="作者" />
            <input v-model="newBookCategory" class="input" placeholder="类型" />
          </div>
          <button class="btn primary" :disabled="creatingBook" @click="createBook">
            ＋ 新增书籍
          </button>
        </div>

        <div class="field-group">
          <label class="field-label">关联书籍</label>
          <select class="select" v-model="selectedBookId" :disabled="loadingBooks">
            <option value="" disabled>请选择书籍</option>
            <option v-for="book in books" :key="book.id" :value="String(book.id)">
              {{ book.book_name }}（{{ book.author || '未知' }}）
            </option>
          </select>
          <button class="btn secondary" @click="fetchBooks" :disabled="loadingBooks">
            ⟳ 刷新
          </button>
        </div>

        <div class="field-group">
          <label class="field-label">原文摘抄（必填）</label>
          <textarea v-model="excerpt" class="textarea" placeholder="粘贴书中的一段话…"></textarea>
        </div>
        <div class="field-group">
          <label class="field-label">个人感悟（选填）</label>
          <textarea v-model="feeling" class="textarea" placeholder="写下你的感受…"></textarea>
        </div>

        <div class="field-group checkbox-row">
          <label class="checkbox-label">
            <input type="checkbox" v-model="generateAiOnCreate" />
            创建时同时生成 AI 建议
          </label>
        </div>

        <button
          class="btn primary"
          :disabled="creatingNote || generatingAi"
          @click="createNote"
        >
          {{ creatingNote || generatingAi ? '处理中…' : '创建笔记' }}
        </button>

        <div class="status-pill">
          <span class="status-dot" :class="{ error: statusError }"></span>
          {{ statusText }}
        </div>

        <div class="collapse-header" @click="collapseBookList = !collapseBookList">
          <span class="collapse-icon">{{ collapseBookList ? '▶' : '▼' }}</span>
          书籍列表（{{ books.length }}）
        </div>
        <div v-show="!collapseBookList" class="collapse-body book-grid-wrap">
          <div class="book-grid">
            <div
              v-for="book in books"
              :key="book.id"
              class="book-card"
              :class="{ active: String(book.id) === selectedBookId }"
              @click="selectedBookId = String(book.id)"
            >
              <div class="book-title">{{ book.book_name }}</div>
              <div class="book-meta">{{ book.author || '未知' }}</div>
              <span class="book-tag">{{ book.category || '未分类' }}</span>
            </div>
          </div>
        </div>
      </section>

      <!-- 右侧：选中书籍的全部笔记 -->
      <section class="panel">
        <div class="panel-title-row">
          <span class="panel-title">
            {{ selectedBook ? `《${selectedBook.book_name}》的全部笔记` : '选择一本书查看笔记' }}
          </span>
          <button
            v-if="selectedBookId"
            class="btn secondary"
            type="button"
            :disabled="loadingNotes"
            @click="fetchNotesForBook(selectedBookId)"
          >
            ⟳ 刷新
          </button>
        </div>

        <div v-if="loadingNotes" class="list-empty">加载中…</div>
        <div v-else-if="!selectedBookId" class="list-empty">
          请先在左侧选择一本书，右侧将自动展示该书的所有原文摘抄与感悟。
        </div>
        <div v-else-if="notesForBook.length === 0" class="list-empty">
          该书暂无笔记，可在左侧创建第一条。
        </div>
        <transition-group name="note-fade" tag="div" v-else class="note-list">
          <div
            v-for="note in sortedNotesForBook"
            :key="note.id"
            class="note-item"
            :class="{ expanded: expandedNoteId === note.id }"
          >
            <div class="note-item-header">
              <span
                class="note-item-toggle"
                @click.stop="toggleNoteExpand(note.id)"
              >
                {{ expandedNoteId === note.id ? '▼' : '▶' }}
              </span>
              <span
                class="note-item-excerpt-preview"
                @click="toggleNoteExpand(note.id)"
              >
                {{ (note.excerpt || '').slice(0, 60) }}{{ (note.excerpt || '').length > 60 ? '…' : '' }}
              </span>
              <button
                class="note-icon-button"
                type="button"
                @click.stop="toggleFavorite(note)"
                :title="isFavorite(note.id) ? '取消收藏' : '收藏置顶'"
              >
                <span :class="{ 'is-favorite': isFavorite(note.id) }">
                  {{ isFavorite(note.id) ? '★' : '☆' }}
                </span>
              </button>
              <button
                class="note-icon-button danger"
                type="button"
                :disabled="deletingNoteId === note.id"
                @click.stop="deleteNote(note.id)"
                title="删除笔记"
              >
                ✕
              </button>
            </div>
            <div v-show="expandedNoteId === note.id" class="note-item-body">
              <div class="note-section note-section--excerpt">
                <div class="note-section-title">原文摘抄</div>
                <div class="note-text">{{ note.excerpt }}</div>
              </div>
              <div class="note-section note-section--feeling">
                <div class="note-section-title">个人感悟</div>
                <div class="note-text">{{ note.feeling || '（未填写）' }}</div>
              </div>
              <template v-if="noteDetailCache[note.id]">
                <div
                  v-if="noteDetailCache[note.id].aiSuggestions?.length"
                  class="note-section note-section--ai"
                >
                  <div class="note-section-title">AI 总结与拓展</div>
                  <div class="note-ai-badge">AI 生成</div>
                  <div class="note-text">
                    {{ noteDetailCache[note.id].note?.ai_summary || '' }}
                  </div>
                  <div
                    v-for="s in noteDetailCache[note.id].aiSuggestions"
                    :key="s.id"
                    class="note-ai-recommend"
                  >
                    <div v-if="s.ai_feeling">{{ s.ai_feeling }}</div>
                    <div v-if="s.ai_recommend">推荐阅读：{{ s.ai_recommend }}</div>
                  </div>
                </div>
                <div v-else-if="note.ai_summary" class="note-section note-section--ai">
                  <div class="note-section-title">AI 总结</div>
                  <div class="note-text">{{ note.ai_summary }}</div>
                </div>
              </template>
              <div v-else-if="expandedNoteId === note.id" class="note-ai-loading-hint">
                正在加载详情…
              </div>
            </div>
          </div>
        </transition-group>

        <!-- 上线版本：不展示调试信息 -->
      </section>
    </main>
  </div>
</template>

<style scoped>
.collapse-header {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 500;
  color: var(--color-text-secondary);
  cursor: pointer;
  padding: 4px 0;
  user-select: none;
}
.collapse-header:hover {
  color: var(--color-primary);
}
.panel-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.panel-title-row .btn {
  flex-shrink: 0;
}
.collapse-icon {
  font-size: 10px;
  opacity: 0.8;
}
.collapse-body {
  padding-left: 14px;
  padding-bottom: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.book-grid-wrap {
  padding-left: 0;
}
.checkbox-row {
  margin-top: -4px;
}
.checkbox-label {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: var(--color-text-secondary);
  cursor: pointer;
}
.checkbox-label input {
  width: auto;
}
.note-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.note-item {
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border-soft);
  overflow: hidden;
}
.note-item-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  cursor: pointer;
  background-color: var(--color-bg-card);
  font-size: 13px;
}
.note-item-header:hover {
  background-color: var(--color-bg-excerpt);
}
.note-item-toggle {
  font-size: 10px;
  color: var(--color-text-muted);
  flex-shrink: 0;
}
.note-item-excerpt-preview {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--color-text-main);
}
.note-item-body {
  padding: 12px;
  border-top: 1px solid var(--color-border-soft);
  background-color: var(--color-bg-excerpt);
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.note-ai-loading-hint {
  font-size: 12px;
  color: var(--color-text-muted);
}

.note-icon-button {
  border: none;
  background: transparent;
  padding: 2px 4px;
  cursor: pointer;
  color: var(--color-text-muted);
  font-size: 14px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.note-icon-button:hover {
  color: var(--color-primary);
}
.note-icon-button.danger:hover {
  color: #b91c1c;
}
.note-icon-button[disabled] {
  opacity: 0.4;
  cursor: default;
}
.note-icon-button .is-favorite {
  color: #f59e0b;
}
</style>
