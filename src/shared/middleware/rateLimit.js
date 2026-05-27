import { ApiError } from "../errors/ApiError.js";

const buckets = new Map();

function getClientKey(req) {
  const forwardedFor = req.get?.("x-forwarded-for");
  if (typeof forwardedFor === "string" && forwardedFor.trim()) {
    return forwardedFor.split(",")[0].trim();
  }

  return req.ip || req.socket?.remoteAddress || "unknown";
}

function sweep(now) {
  for (const [key, bucket] of buckets.entries()) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

export function rateLimit({
  windowMs,
  max,
  message = "Too many requests, please try again later",
  keyPrefix = "global"
}) {
  return (req, res, next) => {
    const now = Date.now();
    if (Math.random() < 0.01) sweep(now);

    const key = `${keyPrefix}:${getClientKey(req)}`;
    const bucket = buckets.get(key);

    if (!bucket || bucket.resetAt <= now) {
      buckets.set(key, { count: 1, resetAt: now + windowMs });
      res.setHeader("RateLimit-Limit", String(max));
      res.setHeader("RateLimit-Remaining", String(max - 1));
      return next();
    }

    bucket.count += 1;
    const remaining = Math.max(max - bucket.count, 0);
    const retryAfterSeconds = Math.ceil((bucket.resetAt - now) / 1000);

    res.setHeader("RateLimit-Limit", String(max));
    res.setHeader("RateLimit-Remaining", String(remaining));
    res.setHeader("RateLimit-Reset", String(Math.ceil(bucket.resetAt / 1000)));

    if (bucket.count > max) {
      res.setHeader("Retry-After", String(retryAfterSeconds));
      return next(ApiError.tooManyRequests(message));
    }

    return next();
  };
}
