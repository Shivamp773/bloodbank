import './setup-env.js';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import request from 'supertest';
import { createApp } from '../app.js';
import { signToken } from '../middlewares/authMiddleware.js';
import { User } from '../models/userModel.js';
import { Inventory } from '../models/inventoryModel.js';
import { DAY_MS } from '../config/constants.js';

const app = createApp();
let mongod;

/** A supertest agent bound to the Express app (no port needed). */
export const api = () => request(app);

export const auth = (token) => ({ Authorization: `Bearer ${token}` });

export const daysAgo = (days) => new Date(Date.now() - days * DAY_MS);
export const daysFromNow = (days) => new Date(Date.now() + days * DAY_MS);

export async function startDb() {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri('bloodbank-test'));
  await Promise.all(Object.values(mongoose.models).map((model) => model.init())); // build indexes
}

export async function stopDb() {
  await mongoose.disconnect();
  await mongod?.stop();
}

export async function clearDb() {
  await Promise.all(Object.values(mongoose.connection.collections).map((c) => c.deleteMany({})));
}

const NAME_FIELDS = {
  donor: { name: 'Test Donor', bloodGroup: 'O+' },
  hospital: { hospitalName: 'Test Hospital' },
  organisation: { organisationName: 'Test Organisation' },
  admin: { name: 'Test Admin' },
};
let counter = 0;

/** Creates a user directly in the database and returns it with a ready-to-use token. */
export async function createUser(role, overrides = {}) {
  counter += 1;
  const user = await User.create({
    role,
    email: `${role}${counter}@test.dev`,
    password: 'Password123',
    phone: '+91 98765 43210',
    address: '1 Test Street',
    ...NAME_FIELDS[role],
    ...overrides,
  });
  return { user, token: signToken(user) };
}

/** Puts `quantity` ml of `bloodGroup` into an organisation's stock via a donation long enough ago. */
export async function addStock(organisation, bloodGroup, quantity) {
  const { user: donor } = await createUser('donor', { bloodGroup });
  return Inventory.create({
    inventoryType: 'in',
    bloodGroup,
    quantity,
    email: donor.email,
    organisation: organisation._id,
    donor: donor._id,
    createdAt: daysAgo(200),
  });
}
