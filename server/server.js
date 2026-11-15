import { config } from './config/env.js';
import { connectDB, disconnectDB } from './config/db.js';
import { runtime } from './config/runtime.js';
import { createApp } from './app.js';
import { migrate } from './seed/migrate.js';
import { DEMO_ACCOUNTS, seedDemoData } from './seed/demoData.js';

function fail(message) {
  console.error(`\n✖ ${message}\n`);
  process.exit(1);
}

async function main() {
  if (config.isProduction && config.jwtSecretIsGenerated) {
    fail('JWT_SECRET must be set when NODE_ENV=production.');
  }

  console.log(config.mongoUrl ? 'Connecting to MongoDB...' : 'Starting the built-in demo database...');
  const { demo } = await connectDB();
  runtime.demoMode = demo;

  await migrate();
  const seeded = demo ? await seedDemoData() : null;

  const app = createApp();
  const server = app.listen(config.port);

  server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
      fail(`Port ${config.port} is already in use. Stop the other program or set PORT in .env.`);
    }
    fail(error.message);
  });

  server.on('listening', () => {
    const lines = [
      '',
      `  Blood Bank API ready on http://localhost:${config.port}  (${config.nodeEnv})`,
      demo
        ? '  Database: built-in demo database. Data resets every time the server restarts.'
        : '  Database: MONGO_URL',
    ];
    if (seeded) {
      lines.push(`  Demo accounts (password ${DEMO_ACCOUNTS[0].password}):`);
      for (const account of DEMO_ACCOUNTS) lines.push(`    ${account.role.padEnd(13)} ${account.email}`);
    }
    if (config.jwtSecretIsGenerated && !demo) {
      lines.push('  Note: JWT_SECRET is not set, so everyone is logged out when the server restarts.');
    }
    console.log(`${lines.join('\n')}\n`);
  });

  const shutdown = async (signal) => {
    console.log(`\n${signal} received, shutting down...`);
    server.close();
    await disconnectDB();
    process.exit(0);
  };
  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);
}

main().catch((error) => fail(error.message));
