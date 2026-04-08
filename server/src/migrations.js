/** Add columns for existing databases (PostgreSQL + SQLite). */
export async function runMigrationsPg(pool) {
  const stmts = [
    'ALTER TABLE lessons ADD COLUMN IF NOT EXISTS video_url TEXT',
    'ALTER TABLE lessons ADD COLUMN IF NOT EXISTS slide_file_path TEXT',
    'ALTER TABLE materials ADD COLUMN IF NOT EXISTS file_path TEXT',
    'ALTER TABLE tests ADD COLUMN IF NOT EXISTS external_url TEXT',
  ];
  for (const sql of stmts) {
    await pool.query(sql);
  }
}

export function runMigrationsSqlite(pool) {
  const stmts = [
    'ALTER TABLE lessons ADD COLUMN video_url TEXT',
    'ALTER TABLE lessons ADD COLUMN slide_file_path TEXT',
    'ALTER TABLE materials ADD COLUMN file_path TEXT',
    'ALTER TABLE tests ADD COLUMN external_url TEXT',
  ];
  for (const sql of stmts) {
    try {
      pool.exec(sql);
    } catch (e) {
      const msg = String(e?.message ?? e);
      if (!/duplicate column|already exists/i.test(msg)) throw e;
    }
  }
}
