/** Serialize AI chat per user + cooldown between provider calls (rate control). */

const locks = new Map();
const lastChatAt = new Map();

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function throwIfAborted(signal) {
  if (signal?.aborted) {
    const err = new Error('Aborted');
    err.name = 'AbortError';
    throw err;
  }
}

/** Default ~2.5s between AI calls per user (override 2000–3000ms as needed). */
const DEFAULT_COOLDOWN_MS = 2500;

export function getAiUserCooldownMs() {
  const n = Number(
    process.env.AI_CHAT_COOLDOWN_MS || process.env.GROQ_USER_COOLDOWN_MS || process.env.GEMINI_USER_COOLDOWN_MS
  );
  if (Number.isFinite(n) && n >= 0) return Math.min(60000, Math.max(0, n));
  return DEFAULT_COOLDOWN_MS;
}

/**
 * @param {number|string} uid
 * @param {AbortSignal} [signal]
 * @param {() => Promise<T>} fn
 * @returns {Promise<T>}
 * @template T
 */
export async function runUserAiChat(uid, signal, fn) {
  const key = String(uid);
  const prev = locks.get(key) || Promise.resolve();
  let release;
  const done = new Promise((r) => {
    release = r;
  });
  locks.set(key, prev.then(() => done));

  await prev;
  throwIfAborted(signal);

  const cooldownMs = getAiUserCooldownMs();
  const last = lastChatAt.get(key) || 0;
  const wait = Math.max(0, cooldownMs - (Date.now() - last));
  if (wait > 0) {
    console.log(`[aiChat] user=${key} cooldown ${wait}ms`);
    await sleep(wait);
    throwIfAborted(signal);
  }

  try {
    return await fn();
  } finally {
    lastChatAt.set(key, Date.now());
    release();
  }
}
