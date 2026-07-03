// Plain Workers entry point (replaces the old Pages Functions convention):
// one fetch() handler, manual path routing. `wrangler.toml`'s `run_worker_first`
// only sends `/api/*` here — every other request is served straight off `assets`
// (including SPA fallback via `not_found_handling`), so this file never needs to
// touch static assets itself.
export interface Env {
  SHARES: KVNamespace;
}

// Status line configs are a few KB at most; this is a generous ceiling against abuse.
const MAX_BODY_BYTES = 64 * 1024;
const TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days
// Refresh the TTL when an existing entry is re-shared past this age, so a link
// someone re-creates on day 6 doesn't die the next day. Bounded to at most one
// extra write per entry per half-life, so replaying the same payload can't be
// used to burn through the KV write quota.
const REFRESH_AFTER_MS = (TTL_SECONDS / 2) * 1000;
const ID_LENGTH = 12;
// Accepts both content-addressed ids (12 chars) and the legacy 8-char random
// ids still alive in KV from before the switch.
const ID_PATTERN = /^[0-9a-zA-Z]{6,16}$/;
const ID_ALPHABET =
  '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';

interface ShareMetadata {
  t?: number; // epoch ms the entry was (re)written
}

// Content-addressed id: same payload always maps to the same short id, so
// re-sharing an identical config is idempotent instead of a fresh KV write.
// ~70 bits from the SHA-256 prefix — collisions are out of reach at any
// plausible entry count, so no retry loop is needed.
async function contentId(raw: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(raw)
  );
  const bytes = new Uint8Array(digest);
  return Array.from(
    bytes.slice(0, ID_LENGTH),
    b => ID_ALPHABET[b % ID_ALPHABET.length]
  ).join('');
}

// ── Write throttling (cheap, best-effort) ───────────────────────────────────
// Per-isolate in-memory sliding window: each isolate/colo counts independently
// and state dies with the isolate, so this is not a hard guarantee — just a
// zero-cost gate that neuters naive single-source write loops before they can
// drain the KV free-tier write quota (1k/day).
const WRITE_LIMIT = 10;
const WRITE_WINDOW_MS = 60_000;
const writeHits = new Map<string, number[]>();

function allowWrite(ip: string, now: number): boolean {
  // Blunt safety valve: a distributed flood could still grow the map unboundedly.
  if (writeHits.size > 10_000) writeHits.clear();
  const hits = (writeHits.get(ip) ?? []).filter(t => now - t < WRITE_WINDOW_MS);
  const allowed = hits.length < WRITE_LIMIT;
  if (allowed) hits.push(now);
  writeHits.set(ip, hits);
  return allowed;
}

// Browsers always send Origin on cross- and same-origin POSTs; requiring it to
// match the request host filters out low-effort curl/script abuse (a spoofed
// header still gets through — this is a gate, not a guarantee).
function sameOrigin(request: Request, url: URL): boolean {
  const origin = request.headers.get('origin');
  if (!origin) return false;
  try {
    return new URL(origin).host === url.host;
  } catch {
    return false;
  }
}

function isCcStatusConfig(value: unknown): boolean {
  return (
    !!value &&
    typeof value === 'object' &&
    Array.isArray((value as { lines?: unknown }).lines)
  );
}

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' }
  });
}

// POST /api/share — store a full config, return a short id to embed as `?s=<id>`.
async function handleCreateShare(
  request: Request,
  env: Env
): Promise<Response> {
  const url = new URL(request.url);
  if (!sameOrigin(request, url)) return json({ error: 'forbidden' }, 403);
  const ip = request.headers.get('cf-connecting-ip') ?? 'unknown';
  if (!allowWrite(ip, Date.now())) return json({ error: 'rate_limited' }, 429);

  const raw = await request.text();
  if (raw.length > MAX_BODY_BYTES)
    return json({ error: 'payload_too_large' }, 413);

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return json({ error: 'invalid_json' }, 400);
  }
  if (!isCcStatusConfig(parsed)) return json({ error: 'invalid_config' }, 400);

  const id = await contentId(raw);
  try {
    const existing = await env.SHARES.getWithMetadata<ShareMetadata>(id);
    if (existing.value === null) {
      await env.SHARES.put(id, raw, {
        expirationTtl: TTL_SECONDS,
        metadata: { t: Date.now() }
      });
      return json({ id }, 201);
    }
    const writtenAt = existing.metadata?.t;
    if (writtenAt === undefined || Date.now() - writtenAt > REFRESH_AFTER_MS) {
      await env.SHARES.put(id, raw, {
        expirationTtl: TTL_SECONDS,
        metadata: { t: Date.now() }
      });
    }
    return json({ id }, 200);
  } catch {
    // KV down or the daily write quota exhausted — tell the client it's the
    // service, not their payload.
    return json({ error: 'share_unavailable' }, 503);
  }
}

// GET /api/share/:id — resolve a short id back to the full config JSON.
async function handleResolveShare(id: string, env: Env): Promise<Response> {
  if (!ID_PATTERN.test(id)) return json({ error: 'invalid_id' }, 400);

  try {
    const value = await env.SHARES.get(id);
    if (value === null) return json({ error: 'not_found' }, 404);
    // Content-addressed entries never change under an id, so both browsers and
    // the CF edge cache (below) may hold them aggressively.
    return new Response(value, {
      headers: {
        'content-type': 'application/json',
        'cache-control': 'public, max-age=86400, immutable'
      }
    });
  } catch {
    return json({ error: 'share_unavailable' }, 503);
  }
}

export default {
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext
  ): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === '/api/share' && request.method === 'POST') {
      return handleCreateShare(request, env);
    }
    const shareMatch = /^\/api\/share\/([^/]+)$/.exec(url.pathname);
    if (shareMatch && request.method === 'GET') {
      // Edge-cache successful resolutions so read floods mostly never reach KV.
      // (The Cache API is a no-op on workers.dev — it kicks in on a custom
      // domain; the browser cache-control header works everywhere regardless.)
      const cache = caches.default;
      const cached = await cache.match(request);
      if (cached) return cached;
      const res = await handleResolveShare(shareMatch[1], env);
      if (res.status === 200) ctx.waitUntil(cache.put(request, res.clone()));
      return res;
    }

    return json({ error: 'not_found' }, 404);
  }
};
