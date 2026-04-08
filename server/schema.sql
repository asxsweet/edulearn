-- PostgreSQL schema for EduLearn (Render / managed Postgres)

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('student', 'admin')),
  student_code TEXT,
  grade_label TEXT,
  avatar_path TEXT,
  bio TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  notifications_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS courses (
  id SERIAL PRIMARY KEY,
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
  id SERIAL PRIMARY KEY,
  course_id INTEGER NOT NULL REFERENCES courses (id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  duration_label TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  key_points_json TEXT NOT NULL DEFAULT '[]',
  video_url TEXT,
  slide_file_path TEXT
);

CREATE TABLE IF NOT EXISTS materials (
  id SERIAL PRIMARY KEY,
  course_id INTEGER NOT NULL REFERENCES courses (id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  size_label TEXT NOT NULL,
  type_label TEXT NOT NULL,
  file_path TEXT
);

CREATE TABLE IF NOT EXISTS external_links (
  id SERIAL PRIMARY KEY,
  course_id INTEGER NOT NULL REFERENCES courses (id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  url TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS tests (
  id SERIAL PRIMARY KEY,
  course_id INTEGER NOT NULL REFERENCES courses (id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  question_count INTEGER NOT NULL,
  time_limit_seconds INTEGER NOT NULL DEFAULT 1800,
  external_url TEXT
);

CREATE TABLE IF NOT EXISTS test_questions (
  id SERIAL PRIMARY KEY,
  test_id INTEGER NOT NULL REFERENCES tests (id) ON DELETE CASCADE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  question_text TEXT NOT NULL,
  options_json TEXT NOT NULL,
  correct_index INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS assignments (
  id SERIAL PRIMARY KEY,
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
  completed BOOLEAN NOT NULL DEFAULT FALSE,
  PRIMARY KEY (user_id, lesson_id)
);

CREATE TABLE IF NOT EXISTS test_attempts (
  user_id INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  test_id INTEGER NOT NULL REFERENCES tests (id) ON DELETE CASCADE,
  score INTEGER,
  completed BOOLEAN NOT NULL DEFAULT FALSE,
  PRIMARY KEY (user_id, test_id)
);

CREATE TABLE IF NOT EXISTS assignment_submissions (
  id SERIAL PRIMARY KEY,
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
  hours DOUBLE PRECISION NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, day_label)
);

CREATE TABLE IF NOT EXISTS profile_completed_courses (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  course_id INTEGER REFERENCES courses (id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  completed_date TEXT NOT NULL,
  grade INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS enrollment_trend (
  id SERIAL PRIMARY KEY,
  month_label TEXT NOT NULL UNIQUE,
  student_count INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS course_completion_stats (
  id SERIAL PRIMARY KEY,
  course_short_name TEXT NOT NULL,
  completion_percent INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS recent_activity (
  id SERIAL PRIMARY KEY,
  student_name TEXT NOT NULL,
  action TEXT NOT NULL,
  course_name TEXT NOT NULL,
  time_ago TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS ai_suggestions (
  id SERIAL PRIMARY KEY,
  sort_order INTEGER NOT NULL,
  text TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS i18n_strings (
  id SERIAL PRIMARY KEY,
  locale TEXT NOT NULL,
  key TEXT NOT NULL,
  value TEXT NOT NULL,
  UNIQUE (locale, key)
);

CREATE TABLE IF NOT EXISTS app_config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
