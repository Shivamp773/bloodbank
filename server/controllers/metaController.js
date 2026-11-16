import mongoose from 'mongoose';
import { runtime } from '../config/runtime.js';
import { User } from '../models/userModel.js';
import { DEMO_ACCOUNTS } from '../seed/demoData.js';

const DEMO_ADMIN_EMAIL = DEMO_ACCOUNTS.find((account) => account.role === 'admin').email;

/**
 * GET /api/v1/meta: the demo accounts for the login page whenever the demo data is loaded, either in
 * the built-in demo database or after `npm run seed` on a real one (e.g. a live demo site).
 */
export async function getMeta(_req, res) {
  const hasDemoData = runtime.demoMode || Boolean(await User.exists({ email: DEMO_ADMIN_EMAIL }));
  res.json({
    success: true,
    demoMode: runtime.demoMode,
    demoAccounts: hasDemoData ? DEMO_ACCOUNTS : [],
  });
}

/** GET /api/v1/meta/health */
export function health(_req, res) {
  const connected = mongoose.connection.readyState === 1;
  res.status(connected ? 200 : 503).json({
    success: connected,
    status: connected ? 'ok' : 'degraded',
    database: connected ? 'connected' : 'disconnected',
  });
}
