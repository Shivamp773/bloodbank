// Entry point when the API runs as a Vercel serverless function (see /api/index.mjs and /vercel.json).
// Locally, use `npm run dev` or `npm start` instead.
import { createApp } from './app.js';
import { config } from './config/env.js';
import { connectDB } from './config/db.js';
import { migrate } from './seed/migrate.js';

const app = createApp();

// Shared by all requests a warm instance handles, so the database connects once per instance.
let ready = null;

class ConfigurationError extends Error {}

async function prepare() {
  // Serverless instances come and go, so neither the built-in demo database nor a generated
  // JWT secret can work here: both must be configured in the Vercel project settings.
  const missing = [!config.mongoUrl && 'MONGO_URL', config.jwtSecretIsGenerated && 'JWT_SECRET'].filter(Boolean);
  if (missing.length > 0) {
    throw new ConfigurationError(
      `The server is missing ${missing.join(' and ')}. Add ${missing.length > 1 ? 'them' : 'it'} in the Vercel ` +
        'project settings (Settings → Environment Variables) and redeploy.',
    );
  }
  await connectDB();
  await migrate();
}

export default async function handler(req, res) {
  try {
    ready ??= prepare();
    await ready;
  } catch (error) {
    ready = null; // try again on the next request
    console.error(error);
    res.statusCode = 503;
    res.setHeader('Content-Type', 'application/json');
    res.end(
      JSON.stringify({
        success: false,
        message:
          error instanceof ConfigurationError
            ? error.message
            : 'The server could not connect to the database. Check MONGO_URL and the database network access settings.',
      }),
    );
    return;
  }
  app(req, res);
}
