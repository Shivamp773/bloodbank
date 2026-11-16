import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';
import { User } from '../models/userModel.js';
import { ApiError } from '../utils/ApiError.js';

export const signToken = (user) =>
  jwt.sign({ userId: String(user._id) }, config.jwtSecret, { expiresIn: config.jwtExpiresIn });

/** Requires a valid `Authorization: Bearer <token>` header and loads the user into `req.user`. */
export async function requireAuth(req, _res, next) {
  const [scheme, token] = (req.get('authorization') || '').trim().split(/\s+/);
  if (scheme?.toLowerCase() !== 'bearer' || !token) {
    throw new ApiError(401, 'Please log in to continue');
  }

  let payload;
  try {
    payload = jwt.verify(token, config.jwtSecret);
  } catch {
    throw new ApiError(401, 'Your session has expired. Please log in again.');
  }

  const user = await User.findById(payload.userId);
  if (!user) throw new ApiError(401, 'Your account no longer exists. Please log in again.');

  req.user = user;
  next();
}

/** Allows the request only for the given roles. Use after requireAuth. */
export const requireRole =
  (...roles) =>
  (req, _res, next) => {
    if (!roles.includes(req.user?.role)) {
      throw new ApiError(403, 'You do not have permission to do this');
    }
    next();
  };
