import 'express-async-errors';
import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';
import { initDatabase } from './db.js';
import { stmt } from './stmt.js';
import { generateGroqReply, getGroqApiKey } from './groq.js';
import { runUserAiChat } from './aiChatGate.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Монореподан `npm run dev` түбінен іске қосқанда cwd — түбі; server/.env міндетті оқылсын.
dotenv.config({ path: path.join(__dirname, '..', '.env') });
const uploadsRoot = path.join(__dirname, '..', 'uploads');
fs.mkdirSync(path.join(uploadsRoot, 'courses'), { recursive: true });
fs.mkdirSync(path.join(uploadsRoot, 'submissions'), { recursive: true });

function fileBasename(p) {
  if (!p) return '';
  const s = String(p).replace(/\\/g, '/');
  const parts = s.split('/');
  return parts[parts.length - 1] || '';
}

function decodeUploadFilename(originalname) {
  const src = String(originalname || '');
  const normalizedSrc = src.normalize('NFC');
  const hasCyrillic = /[А-Яа-яЁёҚқӘәІіҢңҒғҮүҰұӨөҺһ]/.test(normalizedSrc);
  const looksMojibake = /[ÃÐÑ]/.test(normalizedSrc);
  if (hasCyrillic && !looksMojibake) return normalizedSrc;

  const tryDecode = (s) => {
    try {
      return Buffer.from(s, 'latin1').toString('utf8').normalize('NFC');
    } catch {
      return s;
    }
  };

  const once = tryDecode(normalizedSrc);
  const twice = tryDecode(once);

  const score = (s) => {
    const cyr = (s.match(/[А-Яа-яЁёҚқӘәІіҢңҒғҮүҰұӨөҺһ]/g) || []).length;
    const moj = (s.match(/[ÃÐÑ]/g) || []).length;
    const bad = (s.match(/\uFFFD/g) || []).length;
    return cyr * 10 - moj * 5 - bad * 20;
  };

  const variants = [normalizedSrc, once, twice];
  variants.sort((a, b) => score(b) - score(a));
  return variants[0];
}

function sanitizeFilename(name) {
  const normalized = decodeUploadFilename(name);
  const base = fileBasename(normalized)
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, '_')
    .replace(/\s+/g, ' ')
    .trim();
  return base || 'file';
}

function uniqueFilenameInDir(dir, originalName) {
  const safe = sanitizeFilename(originalName);
  const ext = path.extname(safe);
  const stem = safe.slice(0, safe.length - ext.length) || 'file';
  let candidate = `${stem}${ext}`;
  let i = 1;
  while (fs.existsSync(path.join(dir, candidate))) {
    candidate = `${stem} (${i})${ext}`;
    i += 1;
  }
  return candidate;
}

const adminUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      const courseId = req.params.courseId;
      const dir = path.join(uploadsRoot, 'courses', String(courseId));
      fs.mkdirSync(dir, { recursive: true });
      cb(null, dir);
    },
    filename: (req, file, cb) => {
      const courseId = req.params.courseId;
      const dir = path.join(uploadsRoot, 'courses', String(courseId));
      file.originalname = decodeUploadFilename(file.originalname);
      cb(null, uniqueFilenameInDir(dir, file.originalname));
    },
  }),
  limits: { fileSize: 80 * 1024 * 1024 },
});

const submissionUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      const dir = path.join(uploadsRoot, 'submissions');
      fs.mkdirSync(dir, { recursive: true });
      cb(null, dir);
    },
    filename: (req, file, cb) => {
      const dir = path.join(uploadsRoot, 'submissions');
      file.originalname = decodeUploadFilename(file.originalname);
      cb(null, uniqueFilenameInDir(dir, file.originalname));
    },
  }),
  limits: { fileSize: 80 * 1024 * 1024 },
});

/** Курс карточкасында: обложка жолы болса соны, әйтпесе emoji. */
function courseDisplayImage(row) {
  const cover = row.cover_image_path != null ? String(row.cover_image_path).trim() : '';
  if (cover) return cover;
  return row.image_emoji || '📚';
}

const COVER_EXT_BY_MIME = {
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
  'image/svg+xml': '.svg',
  'image/avif': '.avif',
  'image/bmp': '.bmp',
  'image/x-icon': '.ico',
  'image/vnd.microsoft.icon': '.ico',
};

const coverImageUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      const courseId = req.params.courseId;
      const dir = path.join(uploadsRoot, 'courses', String(courseId));
      fs.mkdirSync(dir, { recursive: true });
      cb(null, dir);
    },
    filename: (req, file, cb) => {
      file.originalname = decodeUploadFilename(file.originalname);
      const ext = COVER_EXT_BY_MIME[file.mimetype] || path.extname(file.originalname) || '.jpg';
      cb(null, `cover${ext}`);
    },
  }),
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (/^image\//i.test(file.mimetype)) cb(null, true);
    else cb(new Error('Only image files are allowed'));
  },
});

function timeAgoLabel(dateInput) {
  if (!dateInput) return 'justNow';
  const d = new Date(dateInput);
  if (Number.isNaN(d.getTime())) return 'justNow';
  const diffMs = Date.now() - d.getTime();
  const mins = Math.max(1, Math.floor(diffMs / 60000));
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

/** Last 7 UTC calendar days, counts assignment submissions per day (real DB data). */
async function buildWeeklyActivityFromSubmissions(uid, pool) {
  const rows = await stmt(
    pool,
    `SELECT submitted_at FROM assignment_submissions WHERE user_id = ? AND submitted_at IS NOT NULL`
  ).all(uid);
  const out = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - i);
    const iso = d.toISOString().slice(0, 10);
    out.push({ date: iso, count: 0 });
  }
  const set = new Set(out.map((x) => x.date));
  for (const r of rows) {
    if (!r.submitted_at) continue;
    const iso = new Date(r.submitted_at).toISOString().slice(0, 10);
    if (set.has(iso)) {
      const row = out.find((x) => x.date === iso);
      if (row) row.count += 1;
    }
  }
  return out;
}

async function countDistinctSubmissionDays(uid, pool) {
  const rows = await stmt(
    pool,
    `SELECT submitted_at FROM assignment_submissions WHERE user_id = ? AND submitted_at IS NOT NULL`
  ).all(uid);
  const distinct = new Set();
  for (const r of rows) {
    if (!r.submitted_at) continue;
    distinct.add(new Date(r.submitted_at).toISOString().slice(0, 10));
  }
  return distinct.size;
}

function humanizeKey(key) {
  return String(key)
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^./, (m) => m.toUpperCase());
}

const I18N_FALLBACK = {
  en: {
    completePreviousCourse: 'Complete previous course first',
    markLessonDone: 'Mark as completed',
    lessonDone: 'Completed',
    externalTestLabel: 'External test',
    archived: 'Archived',
    active: 'Active',
    studentsTrend: 'Students Trend',
    testTitleLabel: 'Test title',
    timeSecLabel: 'Time (sec)',
    externalTestLinkOptional: 'External test link (optional)',
    questionTextLabel: 'Question text',
    lessonSaveFirst: 'Save course info first',
    graded: 'graded',
    notFound: 'Not found',
    durationLabel: 'Duration',
    keyPointsPlaceholder: 'Key points (one per line)',
    youtubeUrlPlaceholder: 'YouTube URL (e.g. https://www.youtube.com/watch?v=...)',
    unknownError: 'Error',
  },
  kk: {
    completePreviousCourse: 'Алдыңғы курсты аяқтаңыз',
    markLessonDone: 'Өтілді деп белгілеу',
    lessonDone: 'Оқылды',
    externalTestLabel: 'Сыртқы тест',
    archived: 'Мұрағат',
    active: 'Белсенді',
    studentsTrend: 'Студенттер тренді',
    testTitleLabel: 'Тест атауы',
    timeSecLabel: 'Уақыт (сек)',
    externalTestLinkOptional: 'Сыртқы тест сілтемесі (міндетті емес)',
    questionTextLabel: 'Сұрақ мәтіні',
    lessonSaveFirst: 'Алдымен курс мәліметін сақтаңыз',
    graded: 'бағаланды',
    notFound: 'Табылмады',
    durationLabel: 'Ұзақтығы',
    keyPointsPlaceholder: 'Негізгі ойлар (әр жолға бір)',
    youtubeUrlPlaceholder: 'YouTube сілтемесі (мысалы https://www.youtube.com/watch?v=...)',
    unknownError: 'Қате',
  },
  ru: {
    completePreviousCourse: 'Сначала завершите предыдущий курс',
    markLessonDone: 'Отметить как пройденный',
    lessonDone: 'Пройдено',
    externalTestLabel: 'Внешний тест',
    archived: 'Архив',
    active: 'Активный',
    studentsTrend: 'Тренд студентов',
    testTitleLabel: 'Название теста',
    timeSecLabel: 'Время (сек)',
    externalTestLinkOptional: 'Ссылка на внешний тест (необязательно)',
    questionTextLabel: 'Текст вопроса',
    lessonSaveFirst: 'Сначала сохраните данные курса',
    graded: 'оценено',
    notFound: 'Не найдено',
    durationLabel: 'Длительность',
    keyPointsPlaceholder: 'Ключевые пункты (по одному в строке)',
    youtubeUrlPlaceholder: 'Ссылка YouTube (например https://www.youtube.com/watch?v=...)',
    unknownError: 'Ошибка',
  },
};

const PORT = Number(process.env.PORT || 4000);
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173';
const ALLOWED_ORIGINS = CLIENT_ORIGIN.split(',')
  .map((s) => s.trim())
  .filter(Boolean);
const isLocalDev = process.env.NODE_ENV !== 'production';

const pool = await initDatabase();

const AI_SUGGESTION_KEYS = [
  'suggestExplainML',
  'suggestAiVsMl',
  'suggestNeuralNetworks',
  'suggestUpcomingTestTips',
  'suggestStudyPlan',
];

function normalizeAiLocale(locale) {
  const l = String(locale || '')
    .toLowerCase()
    .replace('_', '-')
    .split('-')[0];
  if (l === 'kk' || l === 'ru') return l;
  return 'en';
}

const DEFAULT_AI_TEMPLATES = {
  en: `Hello, {{name}}!

You wrote: «{{message}}»

Your active courses: {{courses}}

I'm the platform's built-in learning assistant (demo). For full AI answers, connect an LLM API (OpenAI, etc.) in the server. Tips: ask one clear question, name a lesson or topic, or split a big question into smaller parts.`,

  kk: `Сәлем, {{name}}!

Сіздің хабарламаңыз: «{{message}}»

Белсенді курстарыңыз: {{courses}}

Мен платформаның ішкі оқу көмекшісімін (демо режим). Толық ИИ жауабы үшін серверге LLM API (мысалы OpenAI) қосыңыз. Кеңес: бір нақты сұрақ қойыңыз, сабақ атауын немесе тақырыпты көрсетіңіз, үлкен сұрақты бөліктерге бөліңіз.`,

  ru: `Здравствуйте, {{name}}!

Ваше сообщение: «{{message}}»

Активные курсы: {{courses}}

Я встроенный учебный помощник платформы (демо). Для полноценного ИИ подключите LLM API (например OpenAI) на сервере. Совет: формулируйте один чёткий вопрос, укажите урок или тему, разбейте сложный вопрос на части.`,
};

const AI_CHAT_MAX_PART = 900;
/** ~3 айналым (Groq-қа жіберілетін соңғы хабарлар, токен үнемдеу). */
const AI_CHAT_MAX_TURNS = 3;

function sanitizeChatHistory(raw) {
  if (!Array.isArray(raw)) return [];
  const out = [];
  for (const item of raw.slice(-AI_CHAT_MAX_TURNS * 2)) {
    if (!item || typeof item.content !== 'string') continue;
    const role = item.role === 'assistant' ? 'assistant' : item.role === 'user' ? 'user' : null;
    if (!role) continue;
    out.push({ role, content: item.content.slice(0, AI_CHAT_MAX_PART) });
  }
  return out.slice(-AI_CHAT_MAX_TURNS * 2);
}

const AI_SERVICE_BUSY = {
  en: 'AI service is temporarily unavailable. Please try again.',
  kk: 'ИИ қызметі уақытша қолжетімсіз. Кейінірек қайта байқап көріңіз.',
  ru: 'Сервис ИИ временно недоступен. Попробуйте позже.',
};

function aiUnavailableReply(locale) {
  const loc = normalizeAiLocale(locale);
  return AI_SERVICE_BUSY[loc] || AI_SERVICE_BUSY.en;
}

async function buildAiReply(pool, userId, message, locale) {
  const loc = normalizeAiLocale(locale);
  const snippet = String(message || '').trim().slice(0, 500);
  const u = await stmt(pool, `SELECT name FROM users WHERE id = ?`).get(userId);
  const name = u?.name?.trim() || '—';
  const cr = await stmt(
    pool,
    `SELECT c.title FROM enrollments e JOIN courses c ON c.id = e.course_id WHERE e.user_id = ? AND c.status = 'active' ORDER BY c.id`
  ).all(userId);
  const courseTitles = cr.map((r) => r.title).filter(Boolean);
  const courses = courseTitles.length ? courseTitles.join(', ') : '—';

  const cfgKey = `aiChatReplyTemplate_${loc}`;
  const rowLoc = await stmt(pool, `SELECT value FROM app_config WHERE key = ?`).get(cfgKey);
  const rowAny = await stmt(pool, `SELECT value FROM app_config WHERE key = 'aiChatReplyTemplate'`).get();
  const pick = rowLoc?.value || rowAny?.value;
  /** Ескі seed мәтіні LLM кілті жоқ кезде ғана қолданылуы керек; DB-дағы ескі ағылшын stub-ты елемейміз. */
  const isLegacyStub = (v) =>
    typeof v === 'string' &&
    (/Thank you for your question/i.test(v) || /connect an external LLM API/i.test(v));
  let template = !isLegacyStub(pick) ? pick : null;
  template = template || DEFAULT_AI_TEMPLATES[loc] || DEFAULT_AI_TEMPLATES.en;

  return String(template)
    .replace(/\{\{message\}\}/g, snippet)
    .replace(/\{\{snippet\}\}/g, snippet)
    .replace(/\{\{courses\}\}/g, courses)
    .replace(/\{\{name\}\}/g, name);
}

/**
 * Uses Groq (OpenAI-compatible) when GROQ_API_KEY is set; otherwise template fallback.
 * On Groq failure (with key set): short unavailable message (not the long demo template).
 * @returns {Promise<{ reply: string, source: 'groq' | 'unavailable' | 'template' }>}
 */
async function buildAiReplyWithGroq(pool, userId, message, locale, history, opts = {}) {
  const { signal } = opts;
  const loc = normalizeAiLocale(locale);
  const userMsg = String(message || '').trim().slice(0, 2800);
  if (!userMsg) {
    const reply = await buildAiReply(pool, userId, message, locale);
    return { reply, source: 'template' };
  }

  const u = await stmt(pool, `SELECT name FROM users WHERE id = ?`).get(userId);
  const name = u?.name?.trim() || '—';
  const cr = await stmt(
    pool,
    `SELECT c.title FROM enrollments e JOIN courses c ON c.id = e.course_id WHERE e.user_id = ? AND c.status = 'active' ORDER BY c.id`
  ).all(userId);
  const courseTitles = cr.map((r) => r.title).filter(Boolean);
  const courses = courseTitles.length ? courseTitles.join(', ') : '—';

  const apiKey = getGroqApiKey();
  if (!apiKey) {
    console.warn('[Groq] GROQ_API_KEY жоқ — шаблон жауап. server/.env жолын тексеріңіз.');
    const reply = await buildAiReply(pool, userId, message, locale);
    return { reply, source: 'template' };
  }

  try {
    const reply = await generateGroqReply({
      userMessage: userMsg,
      history: sanitizeChatHistory(history),
      locale: loc,
      studentName: name,
      coursesText: courses,
      signal,
    });
    return { reply, source: 'groq' };
  } catch (e) {
    if (e?.name === 'AbortError') throw e;
    console.error('[Groq] fallback:', e?.message || e);
    return { reply: aiUnavailableReply(loc), source: 'unavailable' };
  }
}

const app = express();

/** Supersede in-flight AI work when the same user sends a new message (client abort + server signal). */
const aiChatAbortByUser = new Map();

app.use(
  cors({
    origin(origin, callback) {
      // Allow non-browser requests (no Origin header) and listed origins.
      if (!origin || ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
      // In local development, allow any localhost port (5173, 5174, etc.)
      if (isLocalDev && /^https?:\/\/localhost:\d+$/.test(origin)) return callback(null, true);
      return callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true,
  })
);

async function recomputeEnrollmentProgress(userId, courseId) {
  const totalRow = await stmt(pool, 'SELECT CAST(COUNT(*) AS INTEGER) AS n FROM lessons WHERE course_id = ?').get(courseId);
  const doneRow = await stmt(
    pool,
    `
    SELECT CAST(COUNT(*) AS INTEGER) AS n
    FROM lesson_progress lp
    JOIN lessons l ON l.id = lp.lesson_id
    WHERE lp.user_id = ? AND l.course_id = ? AND lp.completed = TRUE
  `
  ).get(userId, courseId);
  const total = Number(totalRow?.n || 0);
  const done = Number(doneRow?.n || 0);
  const progress = total > 0 ? Math.round((done / total) * 100) : 0;
  await stmt(pool, 'UPDATE enrollments SET progress = ? WHERE user_id = ? AND course_id = ?').run(progress, userId, courseId);
  return { total, done, progress };
}

async function getBlockingCourse(userId, targetCourseId) {
  return stmt(
    pool,
    `
    SELECT c.id, c.title, e.progress
    FROM enrollments e
    JOIN courses c ON c.id = e.course_id
    WHERE e.user_id = ? AND c.status = 'active' AND c.id < ? AND e.progress < 100
    ORDER BY c.id
    LIMIT 1
  `
  ).get(userId, targetCourseId);
}
app.use(express.json({ limit: '2mb' }));
app.use('/uploads', express.static(uploadsRoot));

function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

function authMiddleware(req, res, next) {
  const h = req.headers.authorization;
  if (!h?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  try {
    req.user = jwt.verify(h.slice(7), JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

function requireRole(role) {
  return (req, res, next) => {
    if (req.user?.role !== role) return res.status(403).json({ error: 'Forbidden' });
    next();
  };
}

app.post('/api/auth/register', async (req, res) => {
  const { email, password, name } = req.body || {};
  if (!email || !password || !name) {
    return res.status(400).json({ error: 'email, password, name required' });
  }
  if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });
  const exists = await stmt(pool, 'SELECT id FROM users WHERE email = ?').get(email);
  if (exists) return res.status(409).json({ error: 'Email already registered' });
  const hash = bcrypt.hashSync(password, 10);
  const studentCode = `ST${Date.now().toString().slice(-8)}`;
  const info = await stmt(
    pool,
    `INSERT INTO users (email, password_hash, name, role, student_code, grade_label) VALUES (?,?,?,?,?,?)`
  ).run(email, hash, name, 'student', studentCode, '—');
  const row = await stmt(pool, `SELECT id, email, name, role, student_code, grade_label FROM users WHERE id = ?`).get(
    Number(info.lastInsertRowid)
  );
  const user = {
    id: row.id,
    email: row.email,
    name: row.name,
    role: row.role,
    studentCode: row.student_code,
    gradeLabel: row.grade_label,
  };
  const token = signToken({ sub: user.id, role: user.role, email: user.email });
  res.json({ token, user });
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'email and password required' });
  const row = await stmt(pool, 'SELECT * FROM users WHERE email = ?').get(email);
  if (!row || !bcrypt.compareSync(password, row.password_hash)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  const user = {
    id: row.id,
    email: row.email,
    name: row.name,
    role: row.role,
    studentCode: row.student_code,
    gradeLabel: row.grade_label,
  };
  const token = signToken({ sub: user.id, role: user.role, email: user.email });
  res.json({ token, user });
});

app.get('/api/auth/me', authMiddleware, async (req, res) => {
  const row = await stmt(pool, 'SELECT id, email, name, role, student_code, grade_label, notifications_enabled FROM users WHERE id = ?').get(
    req.user.sub
  );
  if (!row) return res.status(404).json({ error: 'Not found' });
  res.json({
    id: row.id,
    email: row.email,
    name: row.name,
    role: row.role,
    studentCode: row.student_code,
    gradeLabel: row.grade_label,
    notificationsEnabled: !!row.notifications_enabled,
  });
});

app.get('/api/config', async (req, res) => {
  const rows = await stmt(pool, 'SELECT key, value FROM app_config').all();
  const cfg = {};
  for (const r of rows) cfg[r.key] = r.value;
  res.json(cfg);
});

app.get('/api/i18n/:locale', async (req, res) => {
  const locale = req.params.locale;
  const [enRows, kkRows, localeRows] = await Promise.all([
    stmt(pool, 'SELECT key, value FROM i18n_strings WHERE locale = ?').all('en'),
    stmt(pool, 'SELECT key, value FROM i18n_strings WHERE locale = ?').all('kk'),
    stmt(pool, 'SELECT key, value FROM i18n_strings WHERE locale = ?').all(locale),
  ]);
  const out = {};
  for (const r of enRows) out[r.key] = r.value;
  for (const r of kkRows) {
    if (!out[r.key]) out[r.key] = r.value;
  }
  for (const r of localeRows) out[r.key] = r.value;
  const fallback = I18N_FALLBACK[locale] || I18N_FALLBACK.en;
  for (const [k, v] of Object.entries(fallback)) {
    if (!out[k]) out[k] = v;
  }
  // If en/ru still contains Kazakh/Cyrillic leftovers, convert to neutral label.
  if (locale === 'en' || locale === 'ru') {
    for (const [k, v] of Object.entries(out)) {
      if (/[ҚқӘәІіҢңҒғҮүҰұӨөҺһ]/.test(String(v))) {
        out[k] = humanizeKey(k);
      }
    }
  }
  res.json(out);
});

app.get('/api/student/dashboard', authMiddleware, requireRole('student'), async (req, res) => {
  const uid = req.user.sub;
  const enrolled = await stmt(
    pool,
    `
    SELECT c.id, c.title, e.progress, c.accent_color,
      (SELECT CAST(COUNT(*) AS INTEGER) FROM lessons l WHERE l.course_id = c.id) AS total_lessons,
      (SELECT CAST(COUNT(*) AS INTEGER) FROM lesson_progress lp JOIN lessons l ON l.id = lp.lesson_id
        WHERE lp.user_id = ? AND l.course_id = c.id AND lp.completed) AS lessons_done
    FROM enrollments e JOIN courses c ON c.id = e.course_id
    WHERE e.user_id = ? AND c.status = 'active'
  `
  ).all(uid, uid);

  const enrolledCourses = enrolled.map((r) => ({
    id: r.id,
    title: r.title,
    progress: Number(r.total_lessons) > 0 ? Math.round((Number(r.lessons_done) / Number(r.total_lessons)) * 100) : 0,
    lessons: Number(r.lessons_done),
    totalLessons: Number(r.total_lessons),
    color: r.accent_color || '#6366f1',
  }));

  const enrolledCount = Number((await stmt(pool, 'SELECT CAST(COUNT(*) AS INTEGER) AS n FROM enrollments WHERE user_id = ?').get(uid)).n);
  const totalLessons = Number(
    (
      await stmt(
        pool,
        `
    SELECT CAST(COUNT(*) AS INTEGER) AS n FROM lessons l
    JOIN enrollments e ON e.course_id = l.course_id AND e.user_id = ?
  `
      ).get(uid)
    ).n
  );
  const doneLessons = Number(
    (
      await stmt(
        pool,
        `
    SELECT CAST(COUNT(*) AS INTEGER) AS n FROM lesson_progress lp
    WHERE lp.user_id = ? AND lp.completed = TRUE
  `
      ).get(uid)
    ).n
  );

  const avgRow = await stmt(
    pool,
    `
    SELECT AVG(score) AS a FROM test_attempts WHERE user_id = ? AND completed = TRUE AND score IS NOT NULL
  `
  ).get(uid);
  const avgScorePct = avgRow.a != null ? Math.round(Number(avgRow.a)) : 0;

  const certificates = Number(
    (await stmt(pool, 'SELECT CAST(COUNT(*) AS INTEGER) AS n FROM profile_completed_courses WHERE user_id = ?').get(uid)).n
  );

  const weeklyActivity = await buildWeeklyActivityFromSubmissions(uid, pool);
  const activityThisWeek = weeklyActivity.reduce((s, d) => s + d.count, 0);

  const completedCourses = enrolled.filter((e) => e.progress >= 100).length;
  const inProgressCourses = enrolled.filter((e) => e.progress > 0 && e.progress < 100).length;
  const notStartedCourses = enrolled.filter((e) => e.progress === 0).length;

  res.json({
    stats: {
      enrolledCount,
      lessonsLabel: `${doneLessons}/${totalLessons}`,
      avgScore: `${avgScorePct}%`,
      certificates,
      activityThisWeek,
    },
    enrolledCourses,
    weeklyActivity,
    learningStats: {
      completed: completedCourses,
      inProgress: inProgressCourses,
      notStarted: notStartedCourses,
    },
  });
});

app.get('/api/courses', authMiddleware, requireRole('student'), async (req, res) => {
  const uid = req.user.sub;
  const rows = await stmt(
    pool,
    `
    SELECT c.id, c.title, c.description, c.image_emoji, c.cover_image_path, c.duration_weeks,
      e.progress, CASE WHEN e.user_id IS NOT NULL THEN 1 ELSE 0 END AS enrolled,
      (SELECT CAST(COUNT(*) AS INTEGER) FROM lessons l WHERE l.course_id = c.id) AS total_lessons,
      (SELECT CAST(COUNT(*) AS INTEGER) FROM lesson_progress lp JOIN lessons l ON l.id = lp.lesson_id
        WHERE lp.user_id = ? AND l.course_id = c.id AND lp.completed) AS lessons_done
    FROM courses c
    LEFT JOIN enrollments e ON e.course_id = c.id AND e.user_id = ?
    WHERE c.status = 'active'
    ORDER BY c.id
  `
  ).all(uid, uid);

  const mapped = [];
  let previousActiveCompleted = true;
  for (const r of rows) {
    const isEnrolled = !!r.enrolled && Number(r.enrolled) === 1;
    const totalLessons = Number(r.total_lessons || 0);
    const lessonsDone = Number(r.lessons_done || 0);
    const progress = isEnrolled ? (totalLessons > 0 ? Math.round((lessonsDone / totalLessons) * 100) : 0) : 0;
    const unlocked = previousActiveCompleted || isEnrolled;
    mapped.push({
      id: r.id,
      title: r.title,
      description: r.description,
      image: courseDisplayImage(r),
      progress,
      enrolled: isEnrolled,
      lessons: totalLessons,
      duration: `${r.duration_weeks} weeks`,
      unlocked,
    });
    if (!isEnrolled || progress < 100) previousActiveCompleted = false;
  }
  res.json(mapped);
});

app.get('/api/courses/:id', authMiddleware, requireRole('student'), async (req, res) => {
  const uid = req.user.sub;
  const courseId = Number(req.params.id);
  const c = await stmt(pool, 'SELECT * FROM courses WHERE id = ? AND status = ?',).get(courseId, 'active');
  if (!c) return res.status(404).json({ error: 'Course not found' });

  const enrollment = await stmt(pool, 'SELECT * FROM enrollments WHERE user_id = ? AND course_id = ?').get(uid, courseId);
  const isEnrolled = !!enrollment;
  const blocker = await getBlockingCourse(uid, courseId);
  if (isEnrolled && blocker) {
    return res.status(403).json({ error: `Алдымен "${blocker.title}" курсын аяқтаңыз` });
  }
  if (isEnrolled) {
    await recomputeEnrollmentProgress(uid, courseId);
  }

  const lessonRows = await stmt(pool, `SELECT * FROM lessons WHERE course_id = ? ORDER BY sort_order`).all(courseId);
  const lessons = [];
  for (const l of lessonRows) {
    const lp = await stmt(pool, 'SELECT completed FROM lesson_progress WHERE user_id = ? AND lesson_id = ?').get(uid, l.id);
    const slidePath = l.slide_file_path || '';
    lessons.push({
      id: l.id,
      title: l.title,
      duration: l.duration_label,
      completed: lp ? !!lp.completed : false,
      keyPoints: JSON.parse(l.key_points_json || '[]'),
      videoUrl: l.video_url || '',
      slideUrl: slidePath,
      slideFileName: slidePath ? fileBasename(slidePath) : '',
    });
  }

  const matRows = await stmt(pool, `SELECT id, name, size_label AS size, type_label AS type, file_path FROM materials WHERE course_id = ?`).all(courseId);
  const materials = matRows.map((m) => ({
    id: m.id,
    name: m.name,
    size: m.size,
    type: m.type,
    downloadUrl: m.file_path || '',
  }));
  const externalLinks = await stmt(pool, `SELECT name, url FROM external_links WHERE course_id = ?`).all(courseId);

  const testRows = await stmt(pool, `SELECT * FROM tests WHERE course_id = ?`).all(courseId);
  const tests = [];
  for (const t of testRows) {
    const att = await stmt(pool, `SELECT score, completed FROM test_attempts WHERE user_id = ? AND test_id = ?`).get(uid, t.id);
    const qc = Number(t.question_count) || 0;
    tests.push({
      id: t.id,
      title: t.title,
      questions: qc,
      completed: att ? !!att.completed : false,
      score: att?.score,
      externalUrl: t.external_url || '',
    });
  }

  const assignRows = await stmt(pool, `SELECT * FROM assignments WHERE course_id = ?`).all(courseId);
  const assignments = [];
  for (const a of assignRows) {
    const sub = await stmt(pool, `SELECT * FROM assignment_submissions WHERE user_id = ? AND assignment_id = ?`).get(uid, a.id);
    let submissionFileUrl = '';
    if (sub?.file_url) {
      if (String(sub.file_url).startsWith('/uploads/')) submissionFileUrl = sub.file_url;
    }
    assignments.push({
      id: a.id,
      title: a.title,
      dueDate: a.due_date,
      submitted: sub && (sub.status === 'graded' || sub.status === 'pending'),
      submissionStatus: sub?.status || null,
      gradeScore: sub?.score != null ? Number(sub.score) : null,
      teacherFeedback: sub?.feedback ? String(sub.feedback) : '',
      submissionFileUrl,
      submissionLinkUrl: sub?.link_url || '',
    });
  }

  res.json({
    course: {
      id: c.id,
      title: c.title,
      description: c.description,
      image: courseDisplayImage(c),
      lessonCount: lessons.length,
      durationWeeks: c.duration_weeks,
      enrolled: isEnrolled,
      progress: isEnrolled && lessons.length > 0 ? Math.round((lessons.filter((x) => x.completed).length / lessons.length) * 100) : 0,
    },
    lessons,
    materials,
    externalLinks,
    tests,
    assignments,
  });
});

app.post('/api/courses/:id/enroll', authMiddleware, requireRole('student'), async (req, res) => {
  const uid = req.user.sub;
  const courseId = Number(req.params.id);
  const c = await stmt(pool, 'SELECT id, title FROM courses WHERE id = ? AND status = ?').get(courseId, 'active');
  if (!c) return res.status(404).json({ error: 'Not found' });
  const blocker = await getBlockingCourse(uid, courseId);
  if (blocker) {
    return res.status(400).json({
      error: `Алдымен "${blocker.title}" курсын толық аяқтау керек`,
    });
  }
  const has = await stmt(pool, `SELECT 1 AS x FROM enrollments WHERE user_id = ? AND course_id = ?`).get(uid, courseId);
  if (!has) {
    await stmt(pool, `INSERT INTO enrollments (user_id, course_id, progress) VALUES (?,?,0)`).run(uid, courseId);
    const ls = await stmt(pool, 'SELECT id FROM lessons WHERE course_id = ?').all(courseId);
    for (const l of ls) {
      await stmt(pool, 'INSERT INTO lesson_progress (user_id, lesson_id, completed) VALUES (?,?,FALSE)').run(uid, l.id);
    }
  }
  res.json({ ok: true });
});

app.patch('/api/lessons/:id/progress', authMiddleware, requireRole('student'), async (req, res) => {
  const uid = req.user.sub;
  const lessonId = Number(req.params.id);
  const completed = !!req.body?.completed;
  const row = await stmt(pool, 'SELECT id, course_id FROM lessons WHERE id = ?').get(lessonId);
  if (!row) return res.status(404).json({ error: 'Lesson not found' });
  const enrolled = await stmt(pool, 'SELECT user_id FROM enrollments WHERE user_id = ? AND course_id = ?').get(uid, row.course_id);
  if (!enrolled) return res.status(403).json({ error: 'Course not enrolled' });
  const existing = await stmt(pool, 'SELECT user_id FROM lesson_progress WHERE user_id = ? AND lesson_id = ?').get(uid, lessonId);
  if (existing) {
    await stmt(pool, 'UPDATE lesson_progress SET completed = ? WHERE user_id = ? AND lesson_id = ?').run(completed, uid, lessonId);
  } else {
    await stmt(pool, 'INSERT INTO lesson_progress (user_id, lesson_id, completed) VALUES (?,?,?)').run(uid, lessonId, completed);
  }
  const progressRow = await recomputeEnrollmentProgress(uid, row.course_id);
  res.json({ ok: true, progress: progressRow.progress });
});

app.post(
  '/api/assignments/:id/submit',
  authMiddleware,
  requireRole('student'),
  submissionUpload.single('file'),
  async (req, res) => {
    const uid = req.user.sub;
    const aid = Number(req.params.id);
    const linkUrl = (req.body?.linkUrl || req.body?.link_url || '').trim();
    const a = await stmt(pool, 'SELECT id FROM assignments WHERE id = ?').get(aid);
    if (!a) return res.status(404).json({ error: 'Not found' });
    const existing = await stmt(pool, `SELECT id, file_url FROM assignment_submissions WHERE user_id = ? AND assignment_id = ?`).get(uid, aid);
    let fileUrl = '';
    if (req.file) {
      fileUrl = `/uploads/submissions/${req.file.filename}`;
    } else if (existing?.file_url) {
      fileUrl = existing.file_url;
    }
    if (!fileUrl && !linkUrl) {
      return res.status(400).json({ error: 'Файл немесе сілтеме қажет' });
    }
    const now = new Date().toISOString().slice(0, 10);
    if (existing) {
      await stmt(pool, `UPDATE assignment_submissions SET link_url = ?, file_url = ?, submitted_at = ?, status = 'pending' WHERE id = ?`).run(
        linkUrl,
        fileUrl,
        now,
        existing.id
      );
    } else {
      await stmt(
        pool,
        `INSERT INTO assignment_submissions (user_id, assignment_id, file_url, link_url, submitted_at, status) VALUES (?,?,?,?,?, 'pending')`
      ).run(uid, aid, fileUrl, linkUrl, now);
    }
    res.json({ ok: true });
  }
);

app.get('/api/tests/:id', authMiddleware, requireRole('student'), async (req, res) => {
  const testId = Number(req.params.id);
  const t = await stmt(pool, `SELECT id, title, time_limit_seconds, external_url FROM tests WHERE id = ?`).get(testId);
  if (!t) return res.status(404).json({ error: 'Not found' });
  const qs = await stmt(pool, `SELECT id, question_text, options_json FROM test_questions WHERE test_id = ? ORDER BY sort_order`).all(testId);
  const questions = qs.map((q) => ({
    id: q.id,
    question: q.question_text,
    options: JSON.parse(q.options_json || '[]'),
  }));
  const externalOnly = questions.length === 0 && t.external_url;
  res.json({
    test: {
      id: t.id,
      title: t.title,
      timeLimitSeconds: t.time_limit_seconds,
      externalOnly: !!externalOnly,
      externalUrl: t.external_url || '',
    },
    questions,
  });
});

app.post('/api/tests/:id/submit', authMiddleware, requireRole('student'), async (req, res) => {
  const uid = req.user.sub;
  const testId = Number(req.params.id);
  const { answers } = req.body || {};
  if (!answers || typeof answers !== 'object') return res.status(400).json({ error: 'answers required' });

  const qs = await stmt(pool, `SELECT id, correct_index FROM test_questions WHERE test_id = ?`).all(testId);
  if (qs.length === 0) return res.status(400).json({ error: 'Бұл тест үшін сұрақтар жоқ (сыртқы сілтемелік тест)' });
  let correct = 0;
  for (const q of qs) {
    if (Number(answers[q.id]) === q.correct_index) correct++;
  }
  const scorePct = qs.length ? Math.round((correct / qs.length) * 100) : 0;

  const ta = await stmt(pool, `SELECT user_id FROM test_attempts WHERE user_id = ? AND test_id = ?`).get(uid, testId);
  if (ta) {
    await stmt(pool, `UPDATE test_attempts SET score = ?, completed = TRUE WHERE user_id = ? AND test_id = ?`).run(scorePct, uid, testId);
  } else {
    await stmt(pool, `INSERT INTO test_attempts (user_id, test_id, score, completed) VALUES (?,?,?,TRUE)`).run(uid, testId, scorePct);
  }

  res.json({ score: correct, total: qs.length, percent: scorePct });
});

app.post('/api/ai/chat', authMiddleware, requireRole('student'), async (req, res) => {
  const uid = req.user.sub;
  const { message, locale, history } = req.body || {};
  if (!message || !String(message).trim()) return res.status(400).json({ error: 'message required' });

  aiChatAbortByUser.get(uid)?.abort();
  const ac = new AbortController();
  aiChatAbortByUser.set(uid, ac);

  try {
    const { reply, source } = await runUserAiChat(uid, ac.signal, () =>
      buildAiReplyWithGroq(pool, uid, message, locale, history, { signal: ac.signal })
    );
    res.json({
      reply,
      locale: normalizeAiLocale(locale),
      source,
    });
  } catch (e) {
    if (e?.name === 'AbortError') {
      console.log(`[aiChat] user=${uid} aborted (superseded or client disconnect)`);
      if (!res.headersSent) return res.status(204).end();
      return;
    }
    throw e;
  }
});

app.get('/api/ai/suggestions', authMiddleware, requireRole('student'), async (req, res) => {
  res.json({ keys: AI_SUGGESTION_KEYS });
});

app.get('/api/profile', authMiddleware, requireRole('student'), async (req, res) => {
  const uid = req.user.sub;
  const u = await stmt(pool, `SELECT name, student_code, grade_label FROM users WHERE id = ?`).get(uid);
  const completed = await stmt(pool, `SELECT title, completed_date AS "completedDate", grade FROM profile_completed_courses WHERE user_id = ?`).all(uid);

  const enrolled = Number((await stmt(pool, `SELECT CAST(COUNT(*) AS INTEGER) AS n FROM enrollments WHERE user_id = ?`).get(uid)).n);
  const completedCount = completed.length;
  const inProgress = Number(
    (await stmt(pool, `SELECT CAST(COUNT(*) AS INTEGER) AS n FROM enrollments WHERE user_id = ? AND progress > 0 AND progress < 100`).get(uid)).n
  );
  const notStarted = Number(
    (await stmt(pool, `SELECT CAST(COUNT(*) AS INTEGER) AS n FROM enrollments WHERE user_id = ? AND progress = 0`).get(uid)).n
  );

  const avg = await stmt(pool, `SELECT AVG(grade) AS a FROM profile_completed_courses WHERE user_id = ?`).get(uid);
  const avgScore = avg.a != null ? `${Math.round(Number(avg.a))}%` : '0%';

  const learningDaysCount = await countDistinctSubmissionDays(uid, pool);

  const progressData = [
    { labelKey: 'completed', value: completedCount, color: '#10b981' },
    { labelKey: 'inProgress', value: inProgress, color: '#6366f1' },
    { labelKey: 'notStarted', value: notStarted, color: '#e2e8f0' },
  ];

  const stats = [
    { labelKey: 'totalCoursesStat', value: String(enrolled), color: 'blue' },
    { labelKey: 'completedStat', value: String(completedCount), color: 'green' },
    { labelKey: 'averageScoreStat', value: avgScore, color: 'purple' },
    { labelKey: 'learningDaysStat', value: String(learningDaysCount), color: 'pink' },
  ];

  res.json({
    user: u,
    completedCourses: completed,
    progressData,
    stats,
  });
});

app.patch('/api/me', authMiddleware, async (req, res) => {
  const uid = req.user.sub;
  const { name, email, currentPassword, newPassword, notificationsEnabled } = req.body || {};
  const row = await stmt(pool, `SELECT * FROM users WHERE id = ?`).get(uid);
  if (!row) return res.status(404).json({ error: 'Not found' });

  if (email && email !== row.email) {
    const clash = await stmt(pool, `SELECT id FROM users WHERE email = ? AND id != ?`).get(email, uid);
    if (clash) return res.status(409).json({ error: 'Email in use' });
  }

  if (newPassword) {
    if (!currentPassword || !bcrypt.compareSync(currentPassword, row.password_hash)) {
      return res.status(400).json({ error: 'Current password incorrect' });
    }
    const hash = bcrypt.hashSync(newPassword, 10);
    await stmt(pool, `UPDATE users SET password_hash = ? WHERE id = ?`).run(hash, uid);
  }

  const fields = [];
  const vals = [];
  if (name != null) {
    fields.push('name = ?');
    vals.push(name);
  }
  if (email != null) {
    fields.push('email = ?');
    vals.push(email);
  }
  if (notificationsEnabled != null) {
    fields.push('notifications_enabled = ?');
    vals.push(notificationsEnabled);
  }
  if (fields.length) {
    vals.push(uid);
    await stmt(pool, `UPDATE users SET ${fields.join(', ')} WHERE id = ?`).run(...vals);
  }

  const u = await stmt(pool, `SELECT id, email, name, role, student_code, grade_label, notifications_enabled FROM users WHERE id = ?`).get(uid);
  res.json({
    id: u.id,
    email: u.email,
    name: u.name,
    role: u.role,
    studentCode: u.student_code,
    gradeLabel: u.grade_label,
    notificationsEnabled: !!u.notifications_enabled,
  });
});

app.get('/api/admin/overview', authMiddleware, requireRole('admin'), async (req, res) => {
  const totalStudents = Number((await stmt(pool, `SELECT CAST(COUNT(*) AS INTEGER) AS n FROM users WHERE role = 'student'`).get())?.n || 0);
  const totalCourses = Number((await stmt(pool, `SELECT CAST(COUNT(*) AS INTEGER) AS n FROM courses WHERE status = 'active'`).get())?.n || 0);
  const submissions = Number((await stmt(pool, `SELECT CAST(COUNT(*) AS INTEGER) AS n FROM assignment_submissions`).get())?.n || 0);
  const completionRows = await stmt(pool, `SELECT progress FROM enrollments`).all();
  const avgCompletionNum = completionRows.length
    ? Math.round(completionRows.reduce((s, r) => s + Number(r.progress || 0), 0) / completionRows.length)
    : 0;
  const avgCompletionStr = `${avgCompletionNum}%`;

  res.json({
    stats: [
      { labelKey: 'totalStudents', value: String(totalStudents), change: '', color: 'blue' },
      { labelKey: 'totalCourses', value: String(totalCourses), change: '', color: 'purple' },
      { labelKey: 'submissions', value: String(submissions), change: '', color: 'green' },
      { labelKey: 'avgCompletion', value: avgCompletionStr, change: '', color: 'pink' },
    ],
  });
});

app.get('/api/admin/charts', authMiddleware, requireRole('admin'), async (req, res) => {
  const students = await stmt(pool, `SELECT created_at FROM users WHERE role = 'student' ORDER BY created_at ASC`).all();
  const monthly = new Map();
  for (const s of students) {
    const d = new Date(s.created_at || Date.now());
    if (Number.isNaN(d.getTime())) continue;
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    monthly.set(key, (monthly.get(key) || 0) + 1);
  }
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const enrollmentTrend = Array.from(monthly.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([k, n]) => {
      const [y, m] = k.split('-').map(Number);
      return { month: `${monthNames[(m || 1) - 1]} ${y}`, students: Number(n) };
    });

  const courses = await stmt(pool, `SELECT id, title FROM courses WHERE status = 'active' ORDER BY id`).all();
  const coursePerformance = [];
  for (const c of courses) {
    const cnt = Number((await stmt(pool, `SELECT CAST(COUNT(*) AS INTEGER) AS n FROM enrollments WHERE course_id = ?`).get(c.id))?.n || 0);
    const done = Number(
      (await stmt(pool, `SELECT CAST(COUNT(*) AS INTEGER) AS n FROM enrollments WHERE course_id = ? AND progress >= 100`).get(c.id))?.n || 0
    );
    const completion = cnt > 0 ? Math.round((done / cnt) * 100) : 0;
    coursePerformance.push({
      course: String(c.title || '').slice(0, 16),
      completion,
    });
  }
  res.json({ enrollmentTrend, coursePerformance });
});

app.get('/api/admin/recent-activity', authMiddleware, requireRole('admin'), async (req, res) => {
  const rows = await stmt(
    pool,
    `
    SELECT s.id, u.name AS student, c.title AS course, s.status, s.submitted_at
    FROM assignment_submissions s
    JOIN users u ON u.id = s.user_id
    JOIN assignments a ON a.id = s.assignment_id
    JOIN courses c ON c.id = a.course_id
    ORDER BY s.id DESC
    LIMIT 12
  `
  ).all();
  const out = rows.map((r) => ({
    student: r.student,
    actionKey: r.status === 'graded' ? 'graded' : 'submitted',
    course: r.course,
    time: timeAgoLabel(r.submitted_at),
  }));
  res.json(out);
});

app.get('/api/admin/courses', authMiddleware, requireRole('admin'), async (req, res) => {
  const rows = await stmt(pool, `SELECT id, title, status FROM courses ORDER BY id`).all();
  const out = [];
  for (const r of rows) {
    const sn = await stmt(pool, `SELECT CAST(COUNT(*) AS INTEGER) AS n FROM enrollments WHERE course_id = ?`).get(r.id);
    const ln = await stmt(pool, `SELECT CAST(COUNT(*) AS INTEGER) AS n FROM lessons WHERE course_id = ?`).get(r.id);
    out.push({
      id: r.id,
      title: r.title,
      students: Number(sn.n),
      lessons: Number(ln.n),
      status: r.status,
    });
  }
  res.json(out);
});

app.delete('/api/admin/courses/:id', authMiddleware, requireRole('admin'), async (req, res) => {
  const id = Number(req.params.id);
  await stmt(pool, `DELETE FROM courses WHERE id = ?`).run(id);
  res.json({ ok: true });
});

app.get('/api/admin/courses/:id/raw', authMiddleware, requireRole('admin'), async (req, res) => {
  const id = Number(req.params.id);
  const c = await stmt(pool, `SELECT * FROM courses WHERE id = ?`).get(id);
  if (!c) return res.status(404).json({ error: 'Not found' });
  res.json({
    id: c.id,
    title: c.title,
    description: c.description,
    durationWeeks: c.duration_weeks,
    status: c.status,
    coverImagePath: c.cover_image_path || '',
  });
});

app.post('/api/admin/courses', authMiddleware, requireRole('admin'), async (req, res) => {
  const { title, description, durationWeeks } = req.body || {};
  if (!title?.trim() || !description?.trim()) {
    return res.status(400).json({ error: 'title and description required' });
  }
  const info = await stmt(
    pool,
    `INSERT INTO courses (title, description, image_emoji, duration_weeks, status) VALUES (?,?,?,?, 'active')`
  ).run(title.trim(), description.trim(), '📚', Number(durationWeeks) || 6);
  res.json({ id: info.lastInsertRowid });
});

app.put('/api/admin/courses/:id', authMiddleware, requireRole('admin'), async (req, res) => {
  const id = Number(req.params.id);
  const { title, description, durationWeeks } = req.body || {};
  const c = await stmt(pool, `SELECT id FROM courses WHERE id = ?`).get(id);
  if (!c) return res.status(404).json({ error: 'Not found' });
  if (!title?.trim() || !description?.trim()) {
    return res.status(400).json({ error: 'title and description required' });
  }
  await stmt(pool, `UPDATE courses SET title = ?, description = ?, duration_weeks = ? WHERE id = ?`).run(
    title.trim(),
    description.trim(),
    Number(durationWeeks) || 6,
    id
  );
  res.json({ ok: true });
});

app.patch('/api/admin/courses/:id/status', authMiddleware, requireRole('admin'), async (req, res) => {
  const id = Number(req.params.id);
  const status = String(req.body?.status || '').trim();
  if (!['active', 'archived'].includes(status)) {
    return res.status(400).json({ error: 'status must be active or archived' });
  }
  const c = await stmt(pool, 'SELECT id FROM courses WHERE id = ?').get(id);
  if (!c) return res.status(404).json({ error: 'Not found' });
  await stmt(pool, 'UPDATE courses SET status = ? WHERE id = ?').run(status, id);
  res.json({ ok: true });
});

app.post(
  '/api/admin/courses/:courseId/upload',
  authMiddleware,
  requireRole('admin'),
  adminUpload.single('file'),
  async (req, res) => {
    const courseId = Number(req.params.courseId);
    const c = await stmt(pool, 'SELECT id FROM courses WHERE id = ?').get(courseId);
    if (!c) return res.status(404).json({ error: 'Course not found' });
    if (!req.file) return res.status(400).json({ error: 'file required' });
    const url = `/uploads/courses/${courseId}/${req.file.filename}`;
    res.json({
      url,
      originalName: req.file.originalname,
      size: req.file.size,
    });
  }
);

app.post(
  '/api/admin/courses/:courseId/cover',
  authMiddleware,
  requireRole('admin'),
  coverImageUpload.single('file'),
  async (req, res) => {
    const courseId = Number(req.params.courseId);
    const co = await stmt(pool, 'SELECT id FROM courses WHERE id = ?').get(courseId);
    if (!co) return res.status(404).json({ error: 'Course not found' });
    if (!req.file) return res.status(400).json({ error: 'file required' });
    const url = `/uploads/courses/${courseId}/${req.file.filename}`;
    await stmt(pool, `UPDATE courses SET cover_image_path = ? WHERE id = ?`).run(url, courseId);
    res.json({ url });
  }
);

app.delete('/api/admin/courses/:courseId/cover', authMiddleware, requireRole('admin'), async (req, res) => {
  const courseId = Number(req.params.courseId);
  const row = await stmt(pool, 'SELECT cover_image_path FROM courses WHERE id = ?').get(courseId);
  if (!row) return res.status(404).json({ error: 'Course not found' });
  const p = row.cover_image_path;
  if (p && String(p).startsWith('/uploads/')) {
    const rel = String(p).replace(/^\/uploads\//, '');
    const fp = path.join(uploadsRoot, rel);
    try {
      fs.unlinkSync(fp);
    } catch {
      /* */
    }
  }
  await stmt(pool, `UPDATE courses SET cover_image_path = NULL WHERE id = ?`).run(courseId);
  res.json({ ok: true });
});

app.get('/api/admin/courses/:id/editor', authMiddleware, requireRole('admin'), async (req, res) => {
  const courseId = Number(req.params.id);
  const c = await stmt(pool, `SELECT * FROM courses WHERE id = ?`).get(courseId);
  if (!c) return res.status(404).json({ error: 'Not found' });
  const lessonRows = await stmt(pool, `SELECT * FROM lessons WHERE course_id = ? ORDER BY sort_order`).all(courseId);
  const matRows = await stmt(pool, `SELECT * FROM materials WHERE course_id = ? ORDER BY id`).all(courseId);
  const testRows = await stmt(pool, `SELECT * FROM tests WHERE course_id = ? ORDER BY id`).all(courseId);
  const testDetails = [];
  for (const t of testRows) {
    const qs = await stmt(pool, `SELECT id, question_text, options_json, correct_index FROM test_questions WHERE test_id = ? ORDER BY sort_order`).all(t.id);
    testDetails.push({
      id: t.id,
      title: t.title,
      time_limit_seconds: t.time_limit_seconds,
      question_count: t.question_count,
      external_url: t.external_url || '',
      questions: qs.map((q) => ({
        id: q.id,
        question_text: q.question_text,
        options: JSON.parse(q.options_json || '[]'),
        correct_index: q.correct_index,
      })),
    });
  }
  const assignRows = await stmt(pool, `SELECT * FROM assignments WHERE course_id = ? ORDER BY id`).all(courseId);
  res.json({
    course: {
      id: c.id,
      title: c.title,
      description: c.description,
      durationWeeks: c.duration_weeks,
      status: c.status,
      coverImagePath: c.cover_image_path || '',
    },
    lessons: lessonRows.map((l) => ({
      id: l.id,
      title: l.title,
      duration_label: l.duration_label,
      sort_order: l.sort_order,
      key_points: JSON.parse(l.key_points_json || '[]'),
      video_url: l.video_url || '',
      slide_file_path: l.slide_file_path || '',
    })),
    materials: matRows.map((m) => ({
      id: m.id,
      name: m.name,
      size_label: m.size_label,
      type_label: m.type_label,
      file_path: m.file_path || '',
    })),
    tests: testDetails,
    assignments: assignRows.map((a) => ({
      id: a.id,
      title: a.title,
      due_date: a.due_date,
    })),
  });
});

app.post('/api/admin/courses/:courseId/lessons', authMiddleware, requireRole('admin'), async (req, res) => {
  const courseId = Number(req.params.courseId);
  const co = await stmt(pool, 'SELECT id FROM courses WHERE id = ?').get(courseId);
  if (!co) return res.status(404).json({ error: 'Course not found' });
  const { title, duration_label, sort_order, key_points, video_url, slide_file_path } = req.body || {};
  if (!title?.trim()) return res.status(400).json({ error: 'title required' });
  const kp = JSON.stringify(Array.isArray(key_points) ? key_points : []);
  const info = await stmt(
    pool,
    `INSERT INTO lessons (course_id, title, duration_label, sort_order, key_points_json, video_url, slide_file_path) VALUES (?,?,?,?,?,?,?)`
  ).run(
    courseId,
    title.trim(),
    duration_label || '—',
    Number(sort_order) || 0,
    kp,
    video_url?.trim() || null,
    slide_file_path?.trim() || null
  );
  res.json({ id: info.lastInsertRowid });
});

app.patch('/api/admin/lessons/:lessonId', authMiddleware, requireRole('admin'), async (req, res) => {
  const lessonId = Number(req.params.lessonId);
  const row = await stmt(pool, 'SELECT id FROM lessons WHERE id = ?').get(lessonId);
  if (!row) return res.status(404).json({ error: 'Not found' });
  const { title, duration_label, sort_order, key_points, video_url, slide_file_path } = req.body || {};
  const fields = [];
  const vals = [];
  if (title != null) {
    fields.push('title = ?');
    vals.push(String(title).trim());
  }
  if (duration_label != null) {
    fields.push('duration_label = ?');
    vals.push(duration_label);
  }
  if (sort_order != null) {
    fields.push('sort_order = ?');
    vals.push(Number(sort_order));
  }
  if (key_points != null) {
    fields.push('key_points_json = ?');
    vals.push(JSON.stringify(Array.isArray(key_points) ? key_points : []));
  }
  if (video_url !== undefined) {
    fields.push('video_url = ?');
    vals.push(video_url?.trim() || null);
  }
  if (slide_file_path !== undefined) {
    fields.push('slide_file_path = ?');
    vals.push(slide_file_path?.trim() || null);
  }
  if (!fields.length) return res.json({ ok: true });
  vals.push(lessonId);
  await stmt(pool, `UPDATE lessons SET ${fields.join(', ')} WHERE id = ?`).run(...vals);
  res.json({ ok: true });
});

app.delete('/api/admin/lessons/:lessonId', authMiddleware, requireRole('admin'), async (req, res) => {
  const lessonId = Number(req.params.lessonId);
  await stmt(pool, 'DELETE FROM lessons WHERE id = ?').run(lessonId);
  res.json({ ok: true });
});

app.post('/api/admin/courses/:courseId/materials', authMiddleware, requireRole('admin'), async (req, res) => {
  const courseId = Number(req.params.courseId);
  const co = await stmt(pool, 'SELECT id FROM courses WHERE id = ?').get(courseId);
  if (!co) return res.status(404).json({ error: 'Course not found' });
  const { name, size_label, type_label, file_path } = req.body || {};
  if (!name?.trim()) return res.status(400).json({ error: 'name required' });
  if (!file_path?.trim()) return res.status(400).json({ error: 'file_path required (upload file first)' });
  const info = await stmt(
    pool,
    `INSERT INTO materials (course_id, name, size_label, type_label, file_path) VALUES (?,?,?,?,?)`
  ).run(courseId, name.trim(), size_label || '—', type_label || 'file', file_path.trim());
  res.json({ id: info.lastInsertRowid });
});

app.delete('/api/admin/materials/:materialId', authMiddleware, requireRole('admin'), async (req, res) => {
  const materialId = Number(req.params.materialId);
  await stmt(pool, 'DELETE FROM materials WHERE id = ?').run(materialId);
  res.json({ ok: true });
});

app.post('/api/admin/courses/:courseId/tests', authMiddleware, requireRole('admin'), async (req, res) => {
  const courseId = Number(req.params.courseId);
  const co = await stmt(pool, 'SELECT id FROM courses WHERE id = ?').get(courseId);
  if (!co) return res.status(404).json({ error: 'Course not found' });
  const { title, time_limit_seconds, external_url, questions } = req.body || {};
  if (!title?.trim()) return res.status(400).json({ error: 'title required' });
  const qs = Array.isArray(questions) ? questions : [];
  const ext = external_url && String(external_url).trim();
  if (qs.length === 0 && !ext) return res.status(400).json({ error: 'Сұрақтар немесе сыртқы тест сілтемесі қажет' });
  if (qs.length > 50) return res.status(400).json({ error: 'Too many questions (max 50)' });
  const info = await stmt(
    pool,
    `INSERT INTO tests (course_id, title, question_count, time_limit_seconds, external_url) VALUES (?,?,?,?,?)`
  ).run(courseId, title.trim(), qs.length, Number(time_limit_seconds) || 1800, ext || null);
  const testId = info.lastInsertRowid;
  let i = 0;
  for (const q of qs) {
    i++;
    await stmt(
      pool,
      `INSERT INTO test_questions (test_id, sort_order, question_text, options_json, correct_index) VALUES (?,?,?,?,?)`
    ).run(testId, i, q.question_text || '?', JSON.stringify(Array.isArray(q.options) ? q.options : []), Number(q.correct_index) || 0);
  }
  res.json({ id: testId });
});

app.put('/api/admin/tests/:testId', authMiddleware, requireRole('admin'), async (req, res) => {
  const testId = Number(req.params.testId);
  const t = await stmt(pool, 'SELECT id FROM tests WHERE id = ?').get(testId);
  if (!t) return res.status(404).json({ error: 'Not found' });
  const { title, time_limit_seconds, external_url, questions } = req.body || {};
  if (!title?.trim()) return res.status(400).json({ error: 'title required' });
  const qs = Array.isArray(questions) ? questions : [];
  const ext = external_url && String(external_url).trim();
  if (qs.length === 0 && !ext) return res.status(400).json({ error: 'Сұрақтар немесе сыртқы тест сілтемесі қажет' });
  if (qs.length > 50) return res.status(400).json({ error: 'Too many questions (max 50)' });
  await stmt(pool, 'DELETE FROM test_questions WHERE test_id = ?').run(testId);
  await stmt(pool, 'UPDATE tests SET title = ?, question_count = ?, time_limit_seconds = ?, external_url = ? WHERE id = ?').run(
    title.trim(),
    qs.length,
    Number(time_limit_seconds) || 1800,
    ext || null,
    testId
  );
  let i = 0;
  for (const q of qs) {
    i++;
    await stmt(
      pool,
      `INSERT INTO test_questions (test_id, sort_order, question_text, options_json, correct_index) VALUES (?,?,?,?,?)`
    ).run(testId, i, q.question_text || '?', JSON.stringify(Array.isArray(q.options) ? q.options : []), Number(q.correct_index) || 0);
  }
  res.json({ ok: true });
});

app.delete('/api/admin/tests/:testId', authMiddleware, requireRole('admin'), async (req, res) => {
  const testId = Number(req.params.testId);
  await stmt(pool, 'DELETE FROM tests WHERE id = ?').run(testId);
  res.json({ ok: true });
});

app.post('/api/admin/courses/:courseId/assignments', authMiddleware, requireRole('admin'), async (req, res) => {
  const courseId = Number(req.params.courseId);
  const co = await stmt(pool, 'SELECT id FROM courses WHERE id = ?').get(courseId);
  if (!co) return res.status(404).json({ error: 'Course not found' });
  const { title, due_date } = req.body || {};
  if (!title?.trim() || !due_date?.trim()) return res.status(400).json({ error: 'title and due_date required' });
  const info = await stmt(pool, `INSERT INTO assignments (course_id, title, due_date) VALUES (?,?,?)`).run(courseId, title.trim(), due_date.trim());
  res.json({ id: info.lastInsertRowid });
});

app.delete('/api/admin/assignments/:assignmentId', authMiddleware, requireRole('admin'), async (req, res) => {
  const assignmentId = Number(req.params.assignmentId);
  await stmt(pool, 'DELETE FROM assignments WHERE id = ?').run(assignmentId);
  res.json({ ok: true });
});

app.get('/api/admin/students', authMiddleware, requireRole('admin'), async (req, res) => {
  const rows = await stmt(pool, `SELECT id, name, email FROM users WHERE role = 'student' ORDER BY id`).all();
  const out = [];
  for (const s of rows) {
    const enrolledCourses = Number((await stmt(pool, `SELECT CAST(COUNT(*) AS INTEGER) AS n FROM enrollments WHERE user_id = ?`).get(s.id)).n);
    const completedCourses = Number((await stmt(pool, `SELECT CAST(COUNT(*) AS INTEGER) AS n FROM profile_completed_courses WHERE user_id = ?`).get(s.id)).n);
    const avgRow = await stmt(pool, `SELECT AVG(score) AS a FROM test_attempts WHERE user_id = ? AND score IS NOT NULL`).get(s.id);
    out.push({
      id: s.id,
      name: s.name,
      email: s.email,
      enrolledCourses,
      completedCourses,
      averageScore: avgRow.a != null ? Math.round(Number(avgRow.a)) : 0,
      status: 'active',
    });
  }
  res.json(out);
});

app.get('/api/admin/students/:studentId/progress', authMiddleware, requireRole('admin'), async (req, res) => {
  const sid = Number(req.params.studentId);
  const u = await stmt(pool, `SELECT id, name, email, student_code, grade_label FROM users WHERE id = ? AND role = 'student'`).get(sid);
  if (!u) return res.status(404).json({ error: 'Not found' });
  const enrolled = await stmt(
    pool,
    `
    SELECT c.id, c.title, e.progress, c.accent_color,
      (SELECT CAST(COUNT(*) AS INTEGER) FROM lessons l WHERE l.course_id = c.id) AS total_lessons,
      (SELECT CAST(COUNT(*) AS INTEGER) FROM lesson_progress lp JOIN lessons l ON l.id = lp.lesson_id
        WHERE lp.user_id = ? AND l.course_id = c.id AND lp.completed) AS lessons_done
    FROM enrollments e JOIN courses c ON c.id = e.course_id
    WHERE e.user_id = ? AND c.status = 'active'
    ORDER BY c.id
  `
  ).all(sid, sid);
  const courses = [];
  for (const row of enrolled) {
    const totalLessons = Number(row.total_lessons) || 0;
    const lessonsDone = Number(row.lessons_done) || 0;
    const progressPct = totalLessons > 0 ? Math.round((lessonsDone / totalLessons) * 100) : 0;
    const testRows = await stmt(
      pool,
      `
      SELECT t.id, t.title, t.question_count, ta.score, ta.completed
      FROM tests t
      LEFT JOIN test_attempts ta ON ta.test_id = t.id AND ta.user_id = ?
      WHERE t.course_id = ?
      ORDER BY t.id
    `
    ).all(sid, row.id);
    const assignRows = await stmt(
      pool,
      `
      SELECT a.id, a.title, a.due_date, s.status, s.score, s.feedback, s.submitted_at
      FROM assignments a
      LEFT JOIN assignment_submissions s ON s.assignment_id = a.id AND s.user_id = ?
      WHERE a.course_id = ?
      ORDER BY a.id
    `
    ).all(sid, row.id);
    courses.push({
      courseId: row.id,
      title: row.title,
      progress: progressPct,
      lessonsDone,
      totalLessons,
      accentColor: row.accent_color || '#6366f1',
      tests: testRows.map((tr) => ({
        id: tr.id,
        title: tr.title,
        questionCount: Number(tr.question_count) || 0,
        score: tr.score != null ? Number(tr.score) : null,
        completed: !!tr.completed,
      })),
      assignments: assignRows.map((ar) => ({
        id: ar.id,
        title: ar.title,
        dueDate: ar.due_date,
        status: ar.status || 'not_submitted',
        score: ar.score != null ? Number(ar.score) : null,
        feedback: ar.feedback ? String(ar.feedback) : '',
        submittedAt: ar.submitted_at || null,
      })),
    });
  }
  res.json({
    student: {
      id: u.id,
      name: u.name,
      email: u.email,
      studentCode: u.student_code,
      gradeLabel: u.grade_label,
    },
    courses,
  });
});

app.get('/api/admin/submissions', authMiddleware, requireRole('admin'), async (req, res) => {
  const rows = await stmt(
    pool,
    `
    SELECT s.id, u.name AS student, c.title AS course, a.title AS assignment, s.submitted_at AS "submittedDate",
      s.file_url AS "fileUrl", s.link_url AS "linkUrl", s.status, s.score
    FROM assignment_submissions s
    JOIN users u ON u.id = s.user_id
    JOIN assignments a ON a.id = s.assignment_id
    JOIN courses c ON c.id = a.course_id
    ORDER BY s.id
  `
  ).all();
  res.json(rows);
});

app.post('/api/admin/submissions/:id/grade', authMiddleware, requireRole('admin'), async (req, res) => {
  const id = Number(req.params.id);
  const { score, feedback } = req.body || {};
  if (score == null) return res.status(400).json({ error: 'score required' });
  await stmt(pool, `UPDATE assignment_submissions SET score = ?, feedback = ?, status = 'graded' WHERE id = ?`).run(
    Number(score),
    feedback || '',
    id
  );
  res.json({ ok: true });
});

app.get('/api/health', (_, res) => res.json({ ok: true }));

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`API listening on http://localhost:${PORT}`);
});
