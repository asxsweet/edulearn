-- SQLite schema for local dev (when DATABASE_URL is not set)

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('student', 'admin')),
  student_code TEXT,
  grade_label TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  notifications_enabled INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS courses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  image_emoji TEXT NOT NULL DEFAULT '📚',
  cover_image_path TEXT,
  duration_weeks INTEGER NOT NULL DEFAULT 6,
  status TEXT NOT NULL DEFAULT 'active',
  deadline_date TEXT,
  accent_color TEXT DEFAULT '#6366f1'
);

CREATE TABLE IF NOT EXISTS lessons (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  course_id INTEGER NOT NULL REFERENCES courses (id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  duration_label TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  key_points_json TEXT NOT NULL DEFAULT '[]',
  video_url TEXT,
  slide_file_path TEXT
);

CREATE TABLE IF NOT EXISTS materials (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  course_id INTEGER NOT NULL REFERENCES courses (id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  size_label TEXT NOT NULL,
  type_label TEXT NOT NULL,
  file_path TEXT
);

CREATE TABLE IF NOT EXISTS external_links (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  course_id INTEGER NOT NULL REFERENCES courses (id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  url TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS tests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  course_id INTEGER NOT NULL REFERENCES courses (id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  question_count INTEGER NOT NULL,
  time_limit_seconds INTEGER NOT NULL DEFAULT 1800,
  external_url TEXT
);

CREATE TABLE IF NOT EXISTS test_questions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  test_id INTEGER NOT NULL REFERENCES tests (id) ON DELETE CASCADE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  question_text TEXT NOT NULL,
  options_json TEXT NOT NULL,
  correct_index INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS assignments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  course_id INTEGER NOT NULL REFERENCES courses (id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  due_date TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS enrollments (
  user_id INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  course_id INTEGER NOT NULL REFERENCES courses (id) ON DELETE CASCADE,
  progress INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, course_id)
);

CREATE TABLE IF NOT EXISTS lesson_progress (
  user_id INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  lesson_id INTEGER NOT NULL REFERENCES lessons (id) ON DELETE CASCADE,
  completed INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, lesson_id)
);

CREATE TABLE IF NOT EXISTS test_attempts (
  user_id INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  test_id INTEGER NOT NULL REFERENCES tests (id) ON DELETE CASCADE,
  score INTEGER,
  completed INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, test_id)
);

CREATE TABLE IF NOT EXISTS assignment_submissions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  assignment_id INTEGER NOT NULL REFERENCES assignments (id) ON DELETE CASCADE,
  file_url TEXT,
  link_url TEXT,
  submitted_at TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  score INTEGER,
  feedback TEXT
);

CREATE TABLE IF NOT EXISTS weekly_activity (
  user_id INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  day_label TEXT NOT NULL,
  hours REAL NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, day_label)
);

CREATE TABLE IF NOT EXISTS profile_completed_courses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  completed_date TEXT NOT NULL,
  grade INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS enrollment_trend (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  month_label TEXT NOT NULL UNIQUE,
  student_count INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS course_completion_stats (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  course_short_name TEXT NOT NULL,
  completion_percent INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS recent_activity (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_name TEXT NOT NULL,
  action TEXT NOT NULL,
  course_name TEXT NOT NULL,
  time_ago TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS ai_suggestions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sort_order INTEGER NOT NULL,
  text TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS i18n_strings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  locale TEXT NOT NULL,
  key TEXT NOT NULL,
  value TEXT NOT NULL,
  UNIQUE (locale, key)
);

CREATE TABLE IF NOT EXISTS app_config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
