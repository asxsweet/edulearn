const GROQ_CHAT_URL = 'https://api.groq.com/openai/v1/chat/completions';

/** Токен/лимит үнемдеу: қысқа кіріс, қысқа тарих, қысқа шығыс. */
const MAX_USER_CHARS = 2800;
const MAX_HISTORY_MESSAGES = 6; // ~3 айналым
const MAX_PART_CHARS = 900;
const MAX_TOKENS = 512;
const REPLY_TEMPERATURE = 0.55;

/** Supported models (Groq console). Primary → fallback → optional fallback. */
const MODEL_FALLBACKS = ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant', 'mixtral-8x7b-32768'];
const ALLOWED_MODELS = new Set(MODEL_FALLBACKS);

const DEPRECATED_MODEL_ALIASES = {
  'llama3-70b-8192': 'llama-3.3-70b-versatile',
  'llama-3-70b-8192': 'llama-3.3-70b-versatile',
  'llama3-8b-8192': 'llama-3.1-8b-instant',
};

function throwIfAborted(signal) {
  if (signal?.aborted) {
    const err = new Error('Aborted');
    err.name = 'AbortError';
    throw err;
  }
}

function localeToLanguageName(loc) {
  if (loc === 'kk') return 'Kazakh';
  if (loc === 'ru') return 'Russian';
  return 'English';
}

/**
 * @param {Array<{ role: string, content: string }>} history
 */
function historyToOpenAiMessages(history) {
  const list = Array.isArray(history) ? history : [];
  const out = [];
  for (const item of list.slice(-MAX_HISTORY_MESSAGES)) {
    if (!item || typeof item.content !== 'string') continue;
    const role = item.role === 'assistant' ? 'assistant' : item.role === 'user' ? 'user' : null;
    if (!role) continue;
    out.push({ role, content: item.content.slice(0, MAX_PART_CHARS) });
  }
  return out;
}

/** Server-side only. Optional alias VITE_GROQ_API_KEY if the key lives in server/.env under that name. */
export function getGroqApiKey() {
  return (process.env.GROQ_API_KEY || process.env.VITE_GROQ_API_KEY || '').trim();
}

function normalizeModelId(m) {
  const s = String(m || '').trim();
  return DEPRECATED_MODEL_ALIASES[s] || s;
}

function resolvePreferredModel() {
  const raw = (process.env.GROQ_MODEL || 'llama-3.3-70b-versatile').trim();
  const normalized = normalizeModelId(raw);
  return ALLOWED_MODELS.has(normalized) ? normalized : 'llama-3.3-70b-versatile';
}

function modelCandidates() {
  const fromEnv = process.env.GROQ_MODEL_FALLBACKS?.trim();
  if (fromEnv) {
    const parsed = [
      ...new Set(
        fromEnv
          .split(',')
          .map((s) => normalizeModelId(s.trim()))
          .filter((id) => ALLOWED_MODELS.has(id))
      ),
    ];
    if (parsed.length) return parsed;
  }
  const preferred = resolvePreferredModel();
  return [preferred, ...MODEL_FALLBACKS.filter((m) => m !== preferred)];
}

/**
 * Retry with next model for request/model errors; do not retry other models on auth failure.
 */
function shouldTryNextModel(status) {
  if (status === 401 || status === 403) return false;
  return true;
}

/**
 * @param {string} model
 * @param {Array<{ role: string, content: string }>} messages
 */
async function callGroqChat(model, messages, apiKey, signal) {
  const res = await fetch(GROQ_CHAT_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages,
      max_tokens: MAX_TOKENS,
      temperature: REPLY_TEMPERATURE,
    }),
    signal,
  });

  const rawText = await res.text();
  if (!res.ok) {
    let detail = rawText;
    try {
      const j = JSON.parse(rawText);
      detail = j.error?.message || j.message || rawText;
    } catch {
      /* keep rawText */
    }
    const err = new Error(`Groq HTTP ${res.status}: ${detail}`);
    err.statusCode = res.status;
    throw err;
  }

  let data;
  try {
    data = JSON.parse(rawText);
  } catch {
    const err = new Error('Groq: invalid JSON response');
    err.statusCode = res.status;
    throw err;
  }

  const reply = data.choices?.[0]?.message?.content;
  const out = String(reply || '').trim();
  if (!out) {
    const err = new Error('empty groq response');
    err.statusCode = 200;
    throw err;
  }
  return out;
}

/**
 * @param {object} opts
 * @param {string} opts.userMessage
 * @param {Array<{ role: string, content: string }>} opts.history
 * @param {string} opts.locale
 * @param {string} opts.studentName
 * @param {string} opts.coursesText
 * @param {AbortSignal} [opts.signal]
 */
export async function generateGroqReply(opts) {
  const apiKey = getGroqApiKey();
  if (!apiKey) throw new Error('GROQ_API_KEY missing');

  const userMsg = String(opts.userMessage || '').trim().slice(0, MAX_USER_CHARS);
  if (!userMsg) throw new Error('empty prompt');

  const signal = opts.signal;
  const { locale, studentName, coursesText } = opts;
  const langName = localeToLanguageName(locale);

  const system = `You are a learning assistant on an online education platform. Student: ${studentName}. Courses: ${coursesText}.

Brevity (important — saves quota): give SHORT but CORRECT answers. Default length: about 80–150 words, or 3–6 short bullet points. Expand only if the question truly needs detail (e.g. multi-step problem).

Style:
- Entire reply in ${langName} (locale: ${locale}); do not switch language unless asked.
- No long introductions or repetition; start with the answer.
- Concepts, hints, study tips — accurate first; skip filler.
- Homework: guide with hints, do not complete assignments for them.
- Off-topic: one short sentence, then steer to learning.
- Do not claim access to private files; use course names + general knowledge only.`;

  const past = historyToOpenAiMessages(opts.history);
  const messages = [{ role: 'system', content: system }, ...past, { role: 'user', content: userMsg }];

  const candidates = modelCandidates();
  let lastErr;

  for (const model of candidates) {
    throwIfAborted(signal);
    try {
      const out = await callGroqChat(model, messages, apiKey, signal);
      console.log(`[Groq] ok model=${model} candidates=${candidates.join(',')}`);
      return out;
    } catch (e) {
      lastErr = e;
      if (e?.name === 'AbortError') throw e;
      const status = e?.statusCode ?? 0;
      if (!shouldTryNextModel(status)) throw e;
      console.warn(`[Groq] model=${model} failed (${status || 'error'}):`, e?.message || e, '→ try next');
    }
  }

  throw lastErr || new Error('Groq: all models failed');
}
