// Creates an admin account in the database at MONGO_URL (admins can't sign up from the Register page).
// Usage: npm run create-admin -- --email you@example.com --password "a-strong-password" [--name "Your Name"]
import { parseArgs } from 'node:util';
import { z } from 'zod';
import { config } from '../config/env.js';
import { connectDB, disconnectDB } from '../config/db.js';
import { User } from '../models/userModel.js';

const { values } = parseArgs({
  options: {
    email: { type: 'string' },
    password: { type: 'string' },
    name: { type: 'string', default: 'Administrator' },
    phone: { type: 'string', default: '0000000000' },
    address: { type: 'string', default: 'Head office' },
  },
});

const input = z
  .object({
    email: z.string({ error: '--email is required' }).trim().toLowerCase().pipe(z.email('--email is not a valid email')),
    password: z.string({ error: '--password is required' }).min(8, '--password must be at least 8 characters').max(72),
    name: z.string().trim().min(1).max(100),
    phone: z.string().trim().min(1).max(20),
    address: z.string().trim().min(1).max(200),
  })
  .safeParse(values);

if (!input.success) {
  console.error(input.error.issues.map((issue) => issue.message).join('\n'));
  console.error('\nUsage: npm run create-admin -- --email you@example.com --password "a-strong-password"');
  process.exit(1);
}
if (!config.mongoUrl) {
  console.error('MONGO_URL is not set. The demo database already includes admin@bloodbank.test (password Demo@1234).');
  process.exit(1);
}

try {
  await connectDB();
  if (await User.exists({ email: input.data.email })) {
    console.error(`An account with ${input.data.email} already exists.`);
    process.exitCode = 1;
  } else {
    await User.create({ ...input.data, role: 'admin' });
    console.log(`Admin account created for ${input.data.email}. You can log in with the Admin role.`);
  }
} catch (error) {
  console.error(`Could not create the admin: ${error.message}`);
  process.exitCode = 1;
} finally {
  await disconnectDB();
}
