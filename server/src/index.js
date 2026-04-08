import 'express-async-errors';
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import multer from 'multer';
import { initDatabase } from './db.js';
import { stmt } from './stmt.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsRoot = path.join(__dirname, '..', 'uploads');
fs.mkdirSync(path.join(uploadsRoot, 'courses'), { recursive: true });
fs.mkdirSync(path.join(uploadsRoot, 'submissions'), { recursive: true });

function fileBasename(p) {
  if (!p) return '';
  const s = String(p).replace(/\\/g, '/');
  const parts = s.split('/');
  return parts[parts.length - 1] || '';
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
      const ext = path.extname(file.originalname) || '';
      cb(null, `${Date.now()}_${crypto.randomBytes(8).toString('hex')}${ext}`);
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
      const ext = path.extname(file.originalname) || '';
      cb(null, `${Date.now()}_${crypto.randomBytes(8).toString('hex')}${ext}`);
    },
  }),
  limits: { fileSize: 80 * 1024 * 1024 },
});

const PORT = Number(process.env.PORT || 4000);
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173';

const pool = await initDatabase();

const app = express();
app.use(cors({ origin: CLIENT_ORIGIN, credentials: true }));
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
  let rows = await stmt(pool, 'SELECT key, value FROM i18n_strings WHERE locale = ?').all(locale);
  if (rows.length === 0 && locale !== 'en') {
    rows = await stmt(pool, 'SELECT key, value FROM i18n_strings WHERE locale = ?').all('en');
  }
  const out = {};
  for (const r of rows) out[r.key] = r.value;
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
    WHERE e.user_id = ?
  `
  ).all(uid, uid);

  const enrolledCourses = enrolled.map((r) => ({
    id: r.id,
    title: r.title,
    progress: r.progress,
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

  const weeklyActivity = await stmt(
    pool,
    `SELECT day_label AS day, hours FROM weekly_activity WHERE user_id = ? ORDER BY sort_order`
  ).all(uid);

  const totalHours = weeklyActivity.reduce((s, d) => s + Number(d.hours), 0);

  const cfgRow = await stmt(pool, `SELECT value FROM app_config WHERE key = 'studyWeekSubtitle'`).get();
  const prevWeekHint = cfgRow?.value || '';

  const completedCourses = enrolled.filter((e) => e.progress >= 100).length;
  const inProgressCourses = enrolled.filter((e) => e.progress > 0 && e.progress < 100).length;
  const notStartedCourses = enrolled.filter((e) => e.progress === 0).length;

  res.json({
    stats: {
      enrolledCount,
      lessonsLabel: `${doneLessons}/${totalLessons}`,
      avgScore: `${avgScorePct}%`,
      certificates,
      studyHoursThisWeek: `${totalHours.toFixed(1)} hrs`,
      studyWeekSubtitle: prevWeekHint,
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
    SELECT c.id, c.title, c.description, c.image_emoji, c.duration_weeks,
      e.progress, CASE WHEN e.user_id IS NOT NULL THEN 1 ELSE 0 END AS enrolled
    FROM courses c
    LEFT JOIN enrollments e ON e.course_id = c.id AND e.user_id = ?
    ORDER BY c.id
  `
  ).all(uid);

  const mapped = [];
  for (const r of rows) {
    const nRow = await stmt(pool, 'SELECT CAST(COUNT(*) AS INTEGER) AS n FROM lessons WHERE course_id = ?').get(r.id);
    mapped.push({
      id: r.id,
      title: r.title,
      description: r.description,
      image: r.image_emoji,
      progress: r.progress ?? 0,
      enrolled: !!r.enrolled && Number(r.enrolled) === 1,
      lessons: Number(nRow.n),
      duration: `${r.duration_weeks} weeks`,
    });
  }
  res.json(mapped);
});

app.get('/api/courses/:id', authMiddleware, requireRole('student'), async (req, res) => {
  const uid = req.user.sub;
  const courseId = Number(req.params.id);
  const c = await stmt(pool, 'SELECT * FROM courses WHERE id = ?').get(courseId);
  if (!c) return res.status(404).json({ error: 'Course not found' });

  const enrollment = await stmt(pool, 'SELECT * FROM enrollments WHERE user_id = ? AND course_id = ?').get(uid, courseId);
  const isEnrolled = !!enrollment;

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
      submissionFileUrl,
      submissionLinkUrl: sub?.link_url || '',
    });
  }

  res.json({
    course: {
      id: c.id,
      title: c.title,
      description: c.description,
      image: c.image_emoji,
      lessonCount: lessons.length,
      durationWeeks: c.duration_weeks,
      enrolled: isEnrolled,
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
  const c = await stmt(pool, 'SELECT id FROM courses WHERE id = ?').get(courseId);
  if (!c) return res.status(404).json({ error: 'Not found' });
  const has = await stmt(pool, `SELECT 1 AS x FROM enrollments WHERE user_id = ? AND course_id = ?`).get(uid, courseId);
  if (!has) {
    await stmt(pool, `INSERT INTO enrollments (user_id, course_id, progress) VALUES (?,?,0)`).run(uid, courseId);
  }
  res.json({ ok: true });
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
  const { message } = req.body || {};
  if (!message || !String(message).trim()) return res.status(400).json({ error: 'message required' });
  const row = await stmt(pool, `SELECT value FROM app_config WHERE key = 'aiChatReplyTemplate'`).get();
  const template =
    row?.value ||
    'Thank you for your question. Our learning assistant received: "{{message}}". This response is generated by the platform backend; connect an external LLM API here for real AI answers.';
  const reply = template.replace(/\{\{message\}\}/g, String(message).slice(0, 500));
  res.json({ reply });
});

app.get('/api/ai/suggestions', authMiddleware, requireRole('student'), async (req, res) => {
  const rows = await stmt(pool, `SELECT text FROM ai_suggestions ORDER BY sort_order`).all();
  res.json(rows.map((r) => r.text));
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

  const progressData = [
    { labelKey: 'completed', value: completedCount, color: '#10b981' },
    { labelKey: 'inProgress', value: inProgress, color: '#6366f1' },
    { labelKey: 'notStarted', value: notStarted, color: '#e2e8f0' },
  ];

  const ld = await stmt(pool, `SELECT value FROM app_config WHERE key = 'learningDaysValue'`).get();
  const stats = [
    { labelKey: 'totalCoursesStat', value: String(enrolled), color: 'blue' },
    { labelKey: 'completedStat', value: String(completedCount), color: 'green' },
    { labelKey: 'averageScoreStat', value: avgScore, color: 'purple' },
    { labelKey: 'learningDaysStat', value: ld?.value || '45', color: 'pink' },
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
  const totalStudents = Number((await stmt(pool, `SELECT CAST(COUNT(*) AS INTEGER) AS n FROM users WHERE role = 'student'`).get()).n);
  const totalCourses = Number((await stmt(pool, `SELECT CAST(COUNT(*) AS INTEGER) AS n FROM courses`).get()).n);
  const submissions = Number((await stmt(pool, `SELECT CAST(COUNT(*) AS INTEGER) AS n FROM assignment_submissions`).get()).n);
  const avgCompletion = await stmt(pool, `SELECT AVG(completion_percent) AS a FROM course_completion_stats`).get();
  const avgCompletionStr = avgCompletion.a != null ? `${Math.round(Number(avgCompletion.a))}%` : '0%';

  const ch1 = await stmt(pool, `SELECT value FROM app_config WHERE key = 'adminChangeTotalStudents'`).get();
  const ch2 = await stmt(pool, `SELECT value FROM app_config WHERE key = 'adminChangeTotalCourses'`).get();
  const ch3 = await stmt(pool, `SELECT value FROM app_config WHERE key = 'adminChangeSubmissions'`).get();
  const ch4 = await stmt(pool, `SELECT value FROM app_config WHERE key = 'adminChangeAvgCompletion'`).get();

  res.json({
    stats: [
      { labelKey: 'totalStudents', value: String(totalStudents), change: ch1?.value || '', color: 'blue' },
      { labelKey: 'totalCourses', value: String(totalCourses), change: ch2?.value || '', color: 'purple' },
      { labelKey: 'submissions', value: String(submissions), change: ch3?.value || '', color: 'green' },
      { labelKey: 'avgCompletion', value: avgCompletionStr, change: ch4?.value || '', color: 'pink' },
    ],
  });
});

app.get('/api/admin/charts', authMiddleware, requireRole('admin'), async (req, res) => {
  const enrollmentTrend = await stmt(pool, `SELECT month_label AS month, student_count AS students FROM enrollment_trend ORDER BY id`).all();
  const coursePerformance = await stmt(
    pool,
    `SELECT course_short_name AS course, completion_percent AS completion FROM course_completion_stats ORDER BY id`
  ).all();
  res.json({ enrollmentTrend, coursePerformance });
});

app.get('/api/admin/recent-activity', authMiddleware, requireRole('admin'), async (req, res) => {
  const rows = await stmt(
    pool,
    `SELECT student_name AS student, action, course_name AS course, time_ago AS time FROM recent_activity ORDER BY sort_order`
  ).all();
  res.json(rows);
});

app.get('/api/admin/courses', authMiddleware, requireRole('admin'), async (req, res) => {
  const rows = await stmt(pool, `SELECT id, title, status, deadline_date FROM courses ORDER BY id`).all();
  const out = [];
  for (const r of rows) {
    const sn = await stmt(pool, `SELECT CAST(COUNT(*) AS INTEGER) AS n FROM enrollments WHERE course_id = ?`).get(r.id);
    const ln = await stmt(pool, `SELECT CAST(COUNT(*) AS INTEGER) AS n FROM lessons WHERE course_id = ?`).get(r.id);
    out.push({
      id: r.id,
      title: r.title,
      students: Number(sn.n),
      lessons: Number(ln.n),
      deadline: r.deadline_date,
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
    deadline: c.deadline_date,
    status: c.status,
  });
});

app.post('/api/admin/courses', authMiddleware, requireRole('admin'), async (req, res) => {
  const { title, description, deadline, durationWeeks } = req.body || {};
  if (!title?.trim() || !description?.trim()) {
    return res.status(400).json({ error: 'title and description required' });
  }
  const info = await stmt(
    pool,
    `INSERT INTO courses (title, description, image_emoji, duration_weeks, status, deadline_date) VALUES (?,?,?,?, 'active', ?)`
  ).run(title.trim(), description.trim(), '📚', Number(durationWeeks) || 6, deadline || null);
  res.json({ id: info.lastInsertRowid });
});

app.put('/api/admin/courses/:id', authMiddleware, requireRole('admin'), async (req, res) => {
  const id = Number(req.params.id);
  const { title, description, deadline, durationWeeks } = req.body || {};
  const c = await stmt(pool, `SELECT id FROM courses WHERE id = ?`).get(id);
  if (!c) return res.status(404).json({ error: 'Not found' });
  if (!title?.trim() || !description?.trim()) {
    return res.status(400).json({ error: 'title and description required' });
  }
  await stmt(pool, `UPDATE courses SET title = ?, description = ?, deadline_date = ?, duration_weeks = ? WHERE id = ?`).run(
    title.trim(),
    description.trim(),
    deadline || null,
    Number(durationWeeks) || 6,
    id
  );
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
      deadline: c.deadline_date,
      durationWeeks: c.duration_weeks,
      status: c.status,
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
