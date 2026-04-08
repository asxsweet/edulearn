import { toPgParams } from './pg-query.js';

const NO_RETURNING = new Set([
  'enrollments',
  'lesson_progress',
  'weekly_activity',
  'test_attempts',
  'app_config',
]);

export function stmt(pool, sql) {
  const { text } = toPgParams(sql);
  const insertMatch = sql.match(/INSERT\s+INTO\s+(\w+)/i);
  const table = insertMatch ? insertMatch[1].toLowerCase() : '';

  return {
    async run(...params) {
      let q = text;
      if (/INSERT\s+INTO/i.test(sql) && !/RETURNING/i.test(q)) {
        if (!NO_RETURNING.has(table)) {
          q += ' RETURNING id';
        }
      }
      const r = await pool.query(q, params);
      const id = r.rows[0]?.id;
      return { lastInsertRowid: id, changes: r.rowCount };
    },
    async get(...params) {
      const r = await pool.query(text, params);
      return r.rows[0];
    },
    async all(...params) {
      const r = await pool.query(text, params);
      return r.rows;
    },
  };
}
