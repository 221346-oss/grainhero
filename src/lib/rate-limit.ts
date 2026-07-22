/**
 * Phase 2 — Soft in-memory token bucket for privileged server fns.
 *
 * Per-instance memory only (Cloudflare Worker isolate lifetime). Good
 * enough to shield against a single misbehaving client; NOT a substitute
 * for a distributed limiter. Returns a typed decision instead of throwing
 * so callers can surface a friendly UI message.
 *
 * Usage inside a server-fn handler:
 *   const gate = checkRateLimit(`plan-change:${userId}`, { limit: 5, windowMs: 60_000 });
 *   if (!gate.ok) return { error: "rate_limited", retryAfter: gate.retryAfter };
 */
type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

export type RateLimitDecision =
  | { ok: true }
  | { ok: false; retryAfter: number };

export function checkRateLimit(
  key: string,
  opts: { limit: number; windowMs: number },
): RateLimitDecision {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || now >= b.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + opts.windowMs });
    return { ok: true };
  }
  if (b.count >= opts.limit) {
    return { ok: false, retryAfter: Math.ceil((b.resetAt - now) / 1000) };
  }
  b.count += 1;
  return { ok: true };
}

/** Test-only reset. */
export function __resetRateLimits() {
  buckets.clear();
}