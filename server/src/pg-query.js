/** Convert ? placeholders to $1..$n for PostgreSQL */
export function toPgParams(sql) {
  let i = 0;
  const text = sql.replace(/\?/g, () => `$${++i}`);
  return { text, n: i };
}

export async function q(pool, sql, params = []) {
  const { text } = toPgParams(sql);
  return pool.query(text, params);
}

export async function qone(pool, sql, params = []) {
  const r = await q(pool, sql, params);
  return r.rows[0];
}

export async function qall(pool, sql, params = []) {
  const r = await q(pool, sql, params);
  return r.rows;
}
