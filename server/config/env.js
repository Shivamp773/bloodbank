import { existsSync } from 'node:fs';
import path from 'node:path';
import { randomBytes } from 'node:crypto';

/** Repository root (the folder that contains /server and /client). */
export const ROOT_DIR = path.resolve(import.meta.dirname, '..', '..');

// The .env file is optional and lives in the repository root.
const envFile = path.join(ROOT_DIR, '.env');
if (existsSync(envFile)) process.loadEnvFile(envFile);

const nodeEnv = process.env.NODE_ENV || 'development';
const jwtSecretFromEnv = process.env.JWT_SECRET?.trim();

/**
 * Every variable has a safe default for local development, so the app runs with no .env at all.
 * Production (NODE_ENV=production) still requires MONGO_URL and JWT_SECRET; server.js enforces that.
 */
export const config = Object.freeze({
  nodeEnv,
  isProduction: nodeEnv === 'production',
  isTest: nodeEnv === 'test',
  port: Number.parseInt(process.env.PORT, 10) || 8080,
  mongoUrl: process.env.MONGO_URL?.trim() || '',
  // Without JWT_SECRET a random secret is generated per run, so sessions end when the server restarts.
  jwtSecret: jwtSecretFromEnv || randomBytes(48).toString('hex'),
  jwtSecretIsGenerated: !jwtSecretFromEnv,
  jwtExpiresIn: '1d',
});
