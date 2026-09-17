import rateLimit from "express-rate-limit";
import slowDown from "express-slow-down";

/**
 * General-purpose limiter applied to all /api traffic.
 * Blocks a single IP from hammering the API with too many requests
 * in a short window (basic layer-7 flood protection).
 */
export const generalLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  limit: 120, // 120 requests / minute / IP
  standardHeaders: true, // return RateLimit-* headers
  legacyHeaders: false,
  message: { error: "too_many_requests", message: "Too many requests, please slow down." },
});

/**
 * Stricter limiter for expensive / sensitive endpoints (auth, login,
 * password reset, etc.) where brute-force or credential-stuffing style
 * abuse is the bigger risk.
 */
export const strictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 20, // 20 requests / 15 min / IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "too_many_requests", message: "Too many attempts, please try again later." },
});

/**
 * Progressive slow-down: instead of hard-blocking, starts adding delay
 * once an IP crosses a threshold within the window. This smooths out
 * bursty/automated traffic and makes flooding less effective without
 * impacting a normal user with a single retry.
 */
export const speedLimiter = slowDown({
  windowMs: 60 * 1000, // 1 minute
  delayAfter: 60, // allow 60 requests at full speed
  delayMs: (hits) => hits * 100, // then add 100ms per request over the threshold
  maxDelayMs: 5000, // never delay more than 5s
});
