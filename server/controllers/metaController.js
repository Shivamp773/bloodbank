import mongoose from 'mongoose';
import { runtime } from '../config/runtime.js';
import { DEMO_ACCOUNTS } from '../seed/demoData.js';

/** GET /api/v1/meta: tells the client whether it is talking to the demo database (and its accounts). */
export function getMeta(_req, res) {
  res.json({
    success: true,
    demoMode: runtime.demoMode,
    demoAccounts: runtime.demoMode ? DEMO_ACCOUNTS : [],
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
