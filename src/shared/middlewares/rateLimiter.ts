import rateLimit from 'express-rate-limit';

// Strict Rate Limiter for Authentication (Login / Register) - Brute-force protection
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes window
  max: 10, // Limit each IP to 10 login/register requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many authentication attempts from this IP. Please try again after 15 minutes.',
    errorType: 'RATE_LIMIT_EXCEEDED',
  },
});

// Extra Strict Rate Limiter for OTP operations (Send OTP / Verify OTP / Reset Password)
export const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes window
  max: 5, // Limit each IP to 5 OTP requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many OTP requests from this IP. For security reasons, please wait 15 minutes before requesting again.',
    errorType: 'OTP_RATE_LIMIT_EXCEEDED',
  },
});
