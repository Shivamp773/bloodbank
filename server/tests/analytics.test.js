import { after, before, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { addStock, api, auth, clearDb, createUser, startDb, stopDb } from './helpers.js';
import { Inventory } from '../models/inventoryModel.js';
import { BLOOD_GROUPS, DEFAULT_LOW_STOCK_THRESHOLD } from '../config/constants.js';

describe('Analytics', () => {
  let org;

  before(startDb);
  after(stopDb);
  beforeEach(async () => {
    await clearDb();
    org = await createUser('organisation');
  });

  it('returns all eight blood groups in a fixed order with correct totals', async () => {
    await addStock(org.user, 'A-', 1500);
    const hospital = await createUser('hospital');
    await Inventory.create({
      inventoryType: 'out',
      bloodGroup: 'A-',
      quantity: 400,
      email: hospital.user.email,
      organisation: org.user._id,
      hospital: hospital.user._id,
    });

    const res = await api().get('/api/v1/analytics/blood-groups').set(auth(org.token)).expect(200);
    assert.deepEqual(res.body.bloodGroupData.map((g) => g.bloodGroup), BLOOD_GROUPS);
    const aNeg = res.body.bloodGroupData.find((g) => g.bloodGroup === 'A-');
    assert.deepEqual(aNeg, { bloodGroup: 'A-', totalIn: 1500, totalOut: 400, available: 1100 });
  });

  it("flags groups below the organisation's threshold, which it can change", async () => {
    await addStock(org.user, 'O+', 1200);
    let res = await api().get('/api/v1/analytics/blood-groups').set(auth(org.token)).expect(200);
    assert.equal(res.body.threshold, DEFAULT_LOW_STOCK_THRESHOLD);
    assert.equal(res.body.lowStock.includes('O+'), false);

    await api().patch('/api/v1/analytics/settings').set(auth(org.token)).send({ lowStockThreshold: 1500 }).expect(200);
    res = await api().get('/api/v1/analytics/blood-groups').set(auth(org.token)).expect(200);
    assert.equal(res.body.threshold, 1500);
    assert.equal(res.body.lowStock.includes('O+'), true);

    await api().patch('/api/v1/analytics/settings').set(auth(org.token)).send({ lowStockThreshold: -5 }).expect(400);
  });

  it('builds a 30-day trend and totals for the dashboard', async () => {
    const donor = await createUser('donor');
    await Inventory.create({
      inventoryType: 'in',
      bloodGroup: 'B+',
      quantity: 450,
      email: donor.user.email,
      organisation: org.user._id,
      donor: donor.user._id,
    });

    const res = await api()
      .get('/api/v1/analytics/overview')
      .query({ tz: 'Asia/Kolkata' })
      .set(auth(org.token))
      .expect(200);
    assert.equal(res.body.trend.length, 30);
    assert.equal(res.body.trend.at(-1).in, 450);
    assert.equal(res.body.totals.last30Days.donations, 1);
    assert.equal(res.body.totals.donors, 1);
    assert.equal(res.body.totals.availableMl, 450);
  });

  it('rejects an invalid time zone', async () => {
    await api().get('/api/v1/analytics/overview').query({ tz: 'Mars/Olympus' }).set(auth(org.token)).expect(400);
  });

  it('is only available to organisations', async () => {
    const donor = await createUser('donor');
    await api().get('/api/v1/analytics/blood-groups').set(auth(donor.token)).expect(403);
  });
});
