import { rateLimit } from 'express-rate-limit';

/** Slows down password guessing on login/register: 30 attempts per 15 minutes per IP. */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === 'test',
  message: { success: false, message: 'Too many attempts. Please wait a few minutes and try again.' },
});
