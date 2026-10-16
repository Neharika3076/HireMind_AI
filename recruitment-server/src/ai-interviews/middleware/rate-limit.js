export function createRateLimiter({ limit = 30, windowMs = 60_000, message = "Too many interview requests. Please wait a minute and retry." } = {}) {
  const buckets = new Map();
  let calls = 0;
  return (req, res, next) => {
    const now = Date.now();
    const key = req.ip || req.socket?.remoteAddress || "unknown";
    let bucket = buckets.get(key);
    if (!bucket || bucket.resetAt <= now) { bucket = { count: 0, resetAt: now + windowMs }; buckets.set(key, bucket); }
    bucket.count += 1;
    if (++calls % 500 === 0) for (const [candidate, value] of buckets) if (value.resetAt <= now) buckets.delete(candidate);
    if (bucket.count > limit) return res.status(429).json({ error: message });
    res.setHeader("RateLimit-Limit", String(limit));
    res.setHeader("RateLimit-Remaining", String(Math.max(0, limit - bucket.count)));
    next();
  };
}
