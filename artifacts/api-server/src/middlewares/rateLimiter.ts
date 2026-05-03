import rateLimit from "express-rate-limit";

export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "too_many_requests", message: "Too many attempts. Please wait 15 minutes before trying again." },
  skipSuccessfulRequests: false,
});

export const registrationRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "too_many_requests", message: "Too many registration attempts. Please wait an hour." },
});

export const globalRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "too_many_requests", message: "Rate limit exceeded. Please slow down." },
});
