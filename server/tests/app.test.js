import { after, before, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { api, auth, clearDb, startDb, stopDb } from './helpers.js';
import { runtime } from '../config/runtime.js';
import { DAY_MS, DONATION_INTERVAL_DAYS } from '../config/constants.js';
import { DEMO_ACCOUNTS, seedDemoData } from '../seed/demoData.js';
import { migrate } from '../seed/migrate.js';
import { Inventory } from '../models/inventoryModel.js';
import { BloodRequest } from '../models/requestModel.js';
import { User } from '../models/userModel.js';
import { getStockSummary } from '../services/stockService.js';

describe('App', () => {
  before(startDb);
  after(stopDb);
  beforeEach(clearDb);

  it('answers unknown API routes with a JSON 404', async () => {
    const res = await api().get('/api/v1/nope').expect(404);
    assert.equal(res.body.success, false);
  });

  it('answers malformed JSON with a 400', async () => {
    const res = await api()
      .post('/api/v1/auth/login')
      .set('Content-Type', 'application/json')
      .send('{"email": ')
      .expect(400);
    assert.equal(res.body.message, 'Malformed JSON in request body');
  });

  it('reports demo mode and its accounts only when the demo database is used', async () => {
    let res = await api().get('/api/v1/meta').expect(200);
    assert.equal(res.body.demoMode, false);
    assert.deepEqual(res.body.demoAccounts, []);

    runtime.demoMode = true;
    try {
      res = await api().get('/api/v1/meta').expect(200);
      assert.equal(res.body.demoAccounts.length, DEMO_ACCOUNTS.length);
    } finally {
      runtime.demoMode = false;
    }
    await api().get('/api/v1/meta/health').expect(200);
  });

  it('seeds consistent demo data that follows the app rules', async () => {
    const summary = await seedDemoData();
    assert.ok(summary.inventory > 50, `expected plenty of records, got ${summary.inventory}`);
    assert.equal(await seedDemoData(), null, 'seeding twice must not duplicate data');

    // Every demo account can log in with its role.
    for (const account of DEMO_ACCOUNTS) {
      const res = await api().post('/api/v1/auth/login').send(account);
      assert.equal(res.status, 200, `${account.email}: ${res.body.message}`);
    }

    // No organisation ever holds a negative amount of any blood group.
    for (const org of await User.find({ role: 'organisation' })) {
      for (const group of await getStockSummary(org._id)) {
        assert.ok(group.available >= 0, `${org.organisationName} ${group.bloodGroup} is ${group.available}`);
      }
    }

    // Donations by the same donor are at least DONATION_INTERVAL_DAYS apart.
    const donations = await Inventory.find({ inventoryType: 'in' }).sort({ createdAt: 1 }).lean();
    const lastByDonor = new Map();
    for (const record of donations) {
      const previous = lastByDonor.get(String(record.donor));
      if (previous) assert.ok(record.createdAt - previous >= DONATION_INTERVAL_DAYS * DAY_MS);
      lastByDonor.set(String(record.donor), record.createdAt);
    }

    // The demo's urgent O+ request can be approved straight away.
    const city = await User.findOne({ email: 'city@bloodbank.test' });
    const login = await api().post('/api/v1/auth/login').send(DEMO_ACCOUNTS[0]).expect(200);
    const urgent = await BloodRequest.findOne({ organisation: city._id, status: 'pending', bloodGroup: 'O+' });
    await api().patch(`/api/v1/requests/${urgent._id}/approve`).set(auth(login.body.token)).expect(200);

    // The demo donor is eligible to book an appointment.
    const donor = await api().post('/api/v1/auth/login').send(DEMO_ACCOUNTS[2]).expect(200);
    const eligibility = await api().get('/api/v1/appointments/eligibility').set(auth(donor.body.token)).expect(200);
    assert.equal(eligibility.body.eligible, true);
  });

  it('migrates data from v1 ("donar" spelling, mixed-case emails)', async () => {
    const { insertedId: donorId } = await User.collection.insertOne({
      role: 'donar',
      name: 'Old Donor',
      email: 'Old.Donor@Example.com',
      password: 'x',
      address: 'a',
      phone: '1234567',
    });
    await Inventory.collection.insertOne({
      inventoryType: 'in',
      bloodGroup: 'O+',
      quantity: 450,
      email: 'old.donor@example.com',
      organisation: donorId,
      donar: donorId,
    });

    const result = await migrate({ log: () => {} });
    assert.deepEqual(result, { roles: 1, inventory: 1, emails: 1 });

    const migrated = await User.findById(donorId).lean();
    assert.equal(migrated.role, 'donor');
    assert.equal(migrated.email, 'old.donor@example.com');
    assert.equal(await Inventory.countDocuments({ donor: donorId }), 1);

    assert.deepEqual(await migrate({ log: () => {} }), { roles: 0, inventory: 0, emails: 0 });
  });
});
