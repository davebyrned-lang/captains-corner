/**
 * Two-tier rate limiting.
 *
 * By default this uses an in-memory counter, which needs no setup at all but
 * resets whenever Vercel spins up a new instance. That is fine for launch:
 * it stops casual abuse and keeps your Anthropic bill predictable.
 *
 * When you are ready to charge properly, add UPSTASH_REDIS_REST_URL and
 * UPSTASH_REDIS_REST_TOKEN (free tier at upstash.com) and this switches to
 * persistent counting automatically. No code changes needed.
 */

const memory = new Map<string, { count: number; resetAt: number }>();

const DAY_MS = 24 * 60 * 60 * 1000;

function limitPerDay(): number {
  const n = parseInt(process.env.FREE_REVIEWS_PER_DAY ?? "2", 10);
  return Number.isFinite(n) && n > 0 ? n : 2;
}

async function upstash(command: unknown[]): Promise<any | null> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(command),
      cache: "no-store",
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export interface RateResult {
  allowed: boolean;
  remaining: number;
  limit: number;
}

export async function checkRateLimit(identifier: string): Promise<RateResult> {
  const limit = limitPerDay();
  const key = `cc:rl:${identifier}:${new Date().toISOString().slice(0, 10)}`;

  // Persistent path
  const incr = await upstash(["INCR", key]);
  if (incr && typeof incr.result === "number") {
    if (incr.result === 1) await upstash(["EXPIRE", key, 86400]);
    return {
      allowed: incr.result <= limit,
      remaining: Math.max(0, limit - incr.result),
      limit,
    };
  }

  // In-memory fallback
  const now = Date.now();
  const entry = memory.get(key);
  if (!entry || entry.resetAt < now) {
    memory.set(key, { count: 1, resetAt: now + DAY_MS });
    return { allowed: true, remaining: limit - 1, limit };
  }
  entry.count += 1;

  // Stop the map growing forever on a long-lived instance.
  if (memory.size > 5000) {
    for (const [k, v] of memory) if (v.resetAt < now) memory.delete(k);
  }

  return {
    allowed: entry.count <= limit,
    remaining: Math.max(0, limit - entry.count),
    limit,
  };
}

/**
 * PHASE 2 — PAYWALL HOOK
 *
 * Right now this always returns false, so nobody is treated as a subscriber and
 * everyone gets the free daily allowance. When you wire up Stripe, this is the
 * only function you need to change: look the customer up and return true if
 * their subscription is active. Everything else in the app already respects it.
 *
 * See DEPLOY.md, "Phase 2: charging for it", for the full walkthrough.
 */
export async function isSubscriber(_identifier: string): Promise<boolean> {
  if (process.env.PAYWALL_ENABLED !== "true") return false;
  return false;
}
