import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
import { runSeed } from './seed.js';
import { createSqlitePool } from './sqlite-pool.js';
import { runMigrationsPg, runMigrationsSqlite } from './migrations.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export async function initDatabase() {
  const connectionString = process.env.DATABASE_URL?.trim();
  if (connectionString) {
    return initPostgres(connectionString);
  }
  const sqlitePath = process.env.SQLITE_PATH
    ? path.resolve(process.env.SQLITE_PATH)
    : path.join(__dirname, '..', 'data', 'app.db');
  return initSqlite(sqlitePath);
}

async function initPostgres(connectionString) {
  const useSsl =
    process.env.PGSSLMODE === 'require' ||
    process.env.DATABASE_SSL === '1' ||
    /sslmode=require|render\.com|neon\.tech|supabase\.co/i.test(connectionString);

  const pool = new pg.Pool({
    connectionString,
    max: 10,
    ssl: useSsl ? { rejectUnauthorized: false } : undefined,
  });

  const schemaPath = path.join(__dirname, '..', 'schema.sql');
  const sql = fs.readFileSync(schemaPath, 'utf8');
  await pool.query(sql);
  await runMigrationsPg(pool);
  await runSeed(pool);
  console.log('Database: PostgreSQL');
  return pool;
}

async function initSqlite(dbPath) {
  const pool = createSqlitePool(dbPath);
  const schemaPath = path.join(__dirname, '..', 'schema-sqlite.sql');
  const sql = fs.readFileSync(schemaPath, 'utf8');
  pool.exec(sql);
  await runMigrationsSqlite(pool);
  await runSeed(pool);
  console.log(`Database: SQLite (${dbPath})`);
  return pool;
}
