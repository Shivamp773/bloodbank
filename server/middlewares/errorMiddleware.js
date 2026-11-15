import { ApiError } from '../utils/ApiError.js';

export function notFound(req, _res, next) {
  next(new ApiError(404, `Route not found: ${req.method} ${req.originalUrl}`));
}

/**
 * Turns any thrown error into a consistent `{ success: false, message, errors? }` JSON response.
 * Express recognises error handlers by their four parameters, so `_next` must stay.
 */
export function errorHandler(err, _req, res, _next) {
  let status = 500;
  let message = 'Something went wrong. Please try again.';
  let errors;

  if (err instanceof ApiError) {
    status = err.status;
    message = err.message;
    errors = err.details;
  } else if (err?.name === 'ValidationError') {
    status = 400;
    errors = Object.values(err.errors).map((e) => ({ field: e.path, message: e.message }));
    message = errors[0]?.message ?? 'Invalid data';
  } else if (err?.name === 'CastError') {
    status = 400;
    message = `Invalid ${err.path}`;
  } else if (err?.code === 11000) {
    status = 409;
    message = err.keyPattern?.email ? 'An account with this email already exists' : 'This record already exists';
  } else if (err?.expose && err.status) {
    // Errors from Express's body parser, e.g. malformed JSON (400) or a body that is too large (413).
    status = err.status;
    message = err.type === 'entity.parse.failed' ? 'Malformed JSON in request body' : err.message;
  }

  if (status >= 500) console.error(err);
  res.status(status).json({ success: false, message, ...(errors && { errors }) });
}
