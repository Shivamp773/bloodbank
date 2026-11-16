import { existsSync } from 'node:fs';
import path from 'node:path';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import { config, ROOT_DIR } from './config/env.js';
import { errorHandler, notFound } from './middlewares/errorMiddleware.js';
import metaRoutes from './routes/metaRoutes.js';
import authRoutes from './routes/authRoutes.js';
import inventoryRoutes from './routes/inventoryRoutes.js';
import analyticsRoutes from './routes/analyticsRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import requestRoutes from './routes/requestRoutes.js';
import appointmentRoutes from './routes/appointmentRoutes.js';
import organisationRoutes from './routes/organisationRoutes.js';

const CLIENT_DIST = path.join(ROOT_DIR, 'client', 'dist');

/** Builds the Express app. Kept separate from server.js so tests can use it without opening a port. */
export function createApp() {
  const app = express();

  if (config.behindProxy) app.set('trust proxy', 1); // real client IPs (for rate limiting) behind Vercel/Render

  // `upgrade-insecure-requests` is disabled so the built app also works over plain http://localhost.
  app.use(helmet({ contentSecurityPolicy: { directives: { upgradeInsecureRequests: null } } }));
  app.use(cors());
  app.use(express.json({ limit: '100kb' }));
  if (!config.isTest) app.use(morgan(config.isProduction ? 'combined' : 'dev'));

  app.use('/api/v1/meta', metaRoutes);
  app.use('/api/v1/auth', authRoutes);
  app.use('/api/v1/inventory', inventoryRoutes);
  app.use('/api/v1/analytics', analyticsRoutes);
  app.use('/api/v1/admin', adminRoutes);
  app.use('/api/v1/requests', requestRoutes);
  app.use('/api/v1/appointments', appointmentRoutes);
  app.use('/api/v1/organisations', organisationRoutes);
  app.use('/api', notFound); // unknown API routes get a JSON 404, not the React page

  // After `npm run build`, the same server also serves the React app (single-service deployment).
  if (existsSync(CLIENT_DIST)) {
    app.use(express.static(CLIENT_DIST));
    app.get('/{*splat}', (_req, res) => res.sendFile(path.join(CLIENT_DIST, 'index.html')));
  }

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
