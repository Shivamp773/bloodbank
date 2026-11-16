// Loads demo data into the database at MONGO_URL.  Usage: npm run seed [-- --reset]
// (Not needed in demo mode: without MONGO_URL the server seeds its temporary database by itself.)
import { parseArgs } from 'node:util';
import mongoose from 'mongoose';
import { config } from '../config/env.js';
import { connectDB, disconnectDB } from '../config/db.js';
import { User } from '../models/userModel.js';
import { migrate } from './migrate.js';
import { DEMO_ACCOUNTS, seedDemoData } from './demoData.js';

const { values } = parseArgs({ options: { reset: { type: 'boolean', default: false } } });

if (!config.mongoUrl) {
  console.error(
    'MONGO_URL is not set, so there is no persistent database to seed.\n' +
      'Without MONGO_URL, "npm run dev" already starts a demo database with this data.',
  );
  process.exit(1);
}

try {
  await connectDB();
  await migrate();

  if ((await User.estimatedDocumentCount()) > 0) {
    if (!values.reset) {
      console.error('The database already has data. To wipe it and load demo data, run:  npm run seed -- --reset');
      process.exitCode = 1;
    } else {
      // Clear documents but keep collections and their indexes (e.g. the unique email index).
      await Promise.all(Object.values(mongoose.models).map((model) => model.deleteMany({})));
      console.log('Existing data removed.');
    }
  }

  if (!process.exitCode) {
    const summary = await seedDemoData();
    console.log(
      `Demo data loaded: ${summary.users} users, ${summary.inventory} inventory records, ` +
        `${summary.requests} blood requests, ${summary.appointments} appointments.`,
    );
    console.log('\nDemo accounts:');
    for (const account of DEMO_ACCOUNTS) {
      console.log(`  ${account.role.padEnd(13)} ${account.email.padEnd(26)} ${account.password}`);
    }
  }
} catch (error) {
  console.error(`Seeding failed: ${error.message}`);
  process.exitCode = 1;
} finally {
  await disconnectDB();
}
