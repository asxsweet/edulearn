/** Add columns for existing databases (PostgreSQL + SQLite). */
import { stmt } from './stmt.js';

export async function backfillProfileCompleted(pool) {
  const rows = await stmt(
    pool,
    `SELECT e.user_id AS user_id, e.course_id AS course_id, c.title AS title
     FROM enrollments e
     JOIN courses c ON c.id = e.course_id
     WHERE e.progress = 100`
  ).all();
  for (const r of rows) {
    const ex = await stmt(pool, `SELECT id FROM profile_completed_courses WHERE user_id = ? AND course_id = ?`).get(
      r.user_id,
      r.course_id
    );
    if (ex) continue;
    const gRow = await stmt(
      pool,
      `SELECT AVG(ta.score) AS a FROM test_attempts ta
       JOIN tests t ON t.id = ta.test_id
       WHERE ta.user_id = ? AND t.course_id = ? AND ta.score IS NOT NULL`
    ).get(r.user_id, r.course_id);
    const grade = gRow?.a != null ? Math.round(Number(gRow.a)) : 100;
    const today = new Date().toISOString().slice(0, 10);
    await stmt(pool, `INSERT INTO profile_completed_courses (user_id, course_id, title, completed_date, grade) VALUES (?,?,?,?,?)`).run(
      r.user_id,
      r.course_id,
      r.title,
      today,
      grade
    );
  }
}

export async function runMigrationsPg(pool) {
  const stmts = [
    'ALTER TABLE lessons ADD COLUMN IF NOT EXISTS video_url TEXT',
    'ALTER TABLE lessons ADD COLUMN IF NOT EXISTS slide_file_path TEXT',
    'ALTER TABLE materials ADD COLUMN IF NOT EXISTS file_path TEXT',
    'ALTER TABLE tests ADD COLUMN IF NOT EXISTS external_url TEXT',
    'ALTER TABLE courses ADD COLUMN IF NOT EXISTS cover_image_path TEXT',
    'ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_path TEXT',
    'ALTER TABLE users ADD COLUMN IF NOT EXISTS bio TEXT',
    'ALTER TABLE profile_completed_courses ADD COLUMN IF NOT EXISTS course_id INTEGER REFERENCES courses (id) ON DELETE CASCADE',
  ];
  for (const sql of stmts) {
    await pool.query(sql);
  }
  await pool.query(
    `DELETE FROM app_config WHERE key = 'aiChatReplyTemplate' AND value LIKE '%connect an external LLM API%'`
  );
  await pool.query(
    `CREATE UNIQUE INDEX IF NOT EXISTS idx_pcc_user_course ON profile_completed_courses (user_id, course_id) WHERE course_id IS NOT NULL`
  );
  await backfillProfileCompleted(pool);
}

export async function runMigrationsSqlite(pool) {
  const stmts = [
    'ALTER TABLE lessons ADD COLUMN video_url TEXT',
    'ALTER TABLE lessons ADD COLUMN slide_file_path TEXT',
    'ALTER TABLE materials ADD COLUMN file_path TEXT',
    'ALTER TABLE tests ADD COLUMN external_url TEXT',
    'ALTER TABLE courses ADD COLUMN cover_image_path TEXT',
    'ALTER TABLE users ADD COLUMN avatar_path TEXT',
    'ALTER TABLE users ADD COLUMN bio TEXT',
    'ALTER TABLE profile_completed_courses ADD COLUMN course_id INTEGER REFERENCES courses (id) ON DELETE CASCADE',
  ];
  for (const sql of stmts) {
    try {
      pool.exec(sql);
    } catch (e) {
      const msg = String(e?.message ?? e);
      if (!/duplicate column|already exists/i.test(msg)) throw e;
    }
  }
  try {
    pool.exec(
      `DELETE FROM app_config WHERE key = 'aiChatReplyTemplate' AND value LIKE '%connect an external LLM API%'`
    );
  } catch {
    /* */
  }
  try {
    pool.exec(
      `CREATE UNIQUE INDEX IF NOT EXISTS idx_pcc_user_course ON profile_completed_courses (user_id, course_id) WHERE course_id IS NOT NULL`
    );
  } catch (e) {
    const msg = String(e?.message ?? e);
    if (!/already exists/i.test(msg)) throw e;
  }
  await backfillProfileCompleted(pool);
}
