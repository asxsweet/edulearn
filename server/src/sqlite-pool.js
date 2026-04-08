import fs from 'fs';
import path from 'path';
import { DatabaseSync } from 'node:sqlite';

/** Convert PostgreSQL $1,$2 placeholders to SQLite ? */
function pgDollarToSqlite(sql) {
  return sql.replace(/\$(\d+)/g, '?');
}

function normalizeParams(params) {
  return params.map((p) => (typeof p === 'boolean' ? (p ? 1 : 0) : p));
}

/**
 * Minimal adapter: same async query() shape as pg.Pool for stmt.js / pg-query.js.
 * Local dev only (DATABASE_URL unset).
 */
export function createSqlitePool(dbPath) {
  const dir = path.dirname(dbPath);
  if (dir && dir !== '.') fs.mkdirSync(dir, { recursive: true });
  const db = new DatabaseSync(dbPath);
  db.exec('PRAGMA foreign_keys = ON;');

  return {
    exec(sql) {
      db.exec(sql);
    },
    async query(text, params = []) {
      const sqliteSql = pgDollarToSqlite(text);
      const prepared = db.prepare(sqliteSql);
      const args = normalizeParams(params);
      const trimmed = sqliteSql.trimStart();
      const upper = trimmed.toUpperCase();

      if (upper.startsWith('SELECT') || upper.startsWith('WITH')) {
        const rows = prepared.all(...args);
        return { rows, rowCount: rows.length };
      }
      if (/RETURNING/i.test(sqliteSql)) {
        const row = prepared.get(...args);
        return { rows: row ? [row] : [], rowCount: row ? 1 : 0 };
      }
      const result = prepared.run(...args);
      return { rows: [], rowCount: result.changes ?? 0 };
    },
  };
}
