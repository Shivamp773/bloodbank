import { after, before, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { addStock, api, auth, clearDb, createUser, daysAgo, startDb, stopDb } from './helpers.js';
import { Inventory } from '../models/inventoryModel.js';
import { getAvailable } from '../services/stockService.js';
import { DONATION_INTERVAL_DAYS } from '../config/constants.js';

describe('Inventory', () => {
  let org;
  let donor;
  let hospital;

  before(startDb);
  after(stopDb);
  beforeEach(async () => {
    await clearDb();
    org = await createUser('organisation');
    donor = await createUser('donor');
    hospital = await createUser('hospital');
  });

  const record = (token, body) => api().post('/api/v1/inventory').set(auth(token)).send(body);
  const donation = (overrides = {}) => ({
    inventoryType: 'in',
    bloodGroup: 'O+',
    quantity: 450,
    email: donor.user.email,
    ...overrides,
  });

  it('records a donation for the logged-in organisation, ignoring any organisation in the body', async () => {
    const other = await createUser('organisation');
    const res = await record(org.token, donation({ organisation: String(other.user._id) })).expect(201);
    assert.equal(res.body.inventory.organisation, String(org.user._id));
    assert.equal(res.body.inventory.donor, String(donor.user._id));
  });

  it('accepts only donor emails for IN and hospital emails for OUT', async () => {
    const res = await record(org.token, donation({ email: hospital.user.email })).expect(400);
    assert.match(res.body.message, /belongs to a hospital account/);

    await addStock(org.user, 'O+', 900);
    await record(org.token, donation({ inventoryType: 'out', email: donor.user.email })).expect(400);
    await record(org.token, donation({ email: 'nobody@test.dev' })).expect(404);
  });

  it('lets only organisations create records', async () => {
    await record(donor.token, donation()).expect(403);
    await record(hospital.token, donation()).expect(403);
  });

  it('validates blood group and quantity', async () => {
    await record(org.token, donation({ bloodGroup: 'C+' })).expect(400);
    await record(org.token, donation({ quantity: 0 })).expect(400);
    await record(org.token, donation({ quantity: 'lots' })).expect(400);
  });

  it(`blocks a second donation within ${DONATION_INTERVAL_DAYS} days`, async () => {
    await record(org.token, donation()).expect(201);
    const res = await record(org.token, donation()).expect(409);
    assert.match(res.body.message, /can donate again from/);
  });

  it('accepts a donation once the interval has passed', async () => {
    await Inventory.create({
      inventoryType: 'in',
      bloodGroup: 'O+',
      quantity: 450,
      email: donor.user.email,
      organisation: org.user._id,
      donor: donor.user._id,
      createdAt: daysAgo(DONATION_INTERVAL_DAYS + 1),
    });
    await record(org.token, donation()).expect(201);
  });

  it('issues blood only up to the available stock', async () => {
    await addStock(org.user, 'B+', 900);
    const issue = (quantity) =>
      record(org.token, { inventoryType: 'out', bloodGroup: 'B+', quantity, email: hospital.user.email });

    await issue(450).expect(201);
    const res = await issue(900).expect(409);
    assert.equal(res.body.message, 'Only 450 ml of B+ is available');
  });

  it('never oversells when several issues arrive at the same time', async () => {
    await addStock(org.user, 'AB+', 500);
    const results = await Promise.all(
      [1, 2, 3].map(() =>
        record(org.token, { inventoryType: 'out', bloodGroup: 'AB+', quantity: 400, email: hospital.user.email }),
      ),
    );
    assert.ok(results.filter((r) => r.status === 201).length <= 1);
    assert.ok((await getAvailable(org.user._id, 'AB+')) >= 0);
  });

  it("lists only the organisation's own records, with filters and pagination", async () => {
    const other = await createUser('organisation');
    await addStock(org.user, 'A+', 450);
    await addStock(org.user, 'B+', 450);
    await addStock(other.user, 'A+', 450);

    const all = await api().get('/api/v1/inventory').set(auth(org.token)).expect(200);
    assert.equal(all.body.pagination.total, 2);

    const filtered = await api()
      .get('/api/v1/inventory')
      .query({ bloodGroup: 'A+', limit: 1 })
      .set(auth(org.token))
      .expect(200);
    assert.equal(filtered.body.inventory.length, 1);
    assert.equal(filtered.body.inventory[0].bloodGroup, 'A+');
    assert.equal(filtered.body.pagination.pages, 1);
  });

  it('scopes history to the logged-in donor or hospital', async () => {
    const otherDonor = await createUser('donor');
    const base = { inventoryType: 'in', bloodGroup: 'O+', quantity: 450, organisation: org.user._id };
    await Inventory.create([
      { ...base, email: donor.user.email, donor: donor.user._id },
      { ...base, email: otherDonor.user.email, donor: otherDonor.user._id },
    ]);
    await record(org.token, { inventoryType: 'out', bloodGroup: 'O+', quantity: 450, email: hospital.user.email }).expect(201);

    const donorHistory = await api().get('/api/v1/inventory/history').set(auth(donor.token)).expect(200);
    assert.equal(donorHistory.body.inventory.length, 1);
    assert.equal(donorHistory.body.inventory[0].email, donor.user.email);

    const hospitalHistory = await api().get('/api/v1/inventory/history').set(auth(hospital.token)).expect(200);
    assert.equal(hospitalHistory.body.inventory.length, 1);
    assert.equal(hospitalHistory.body.inventory[0].inventoryType, 'out');
  });

  it('never includes password hashes in populated lists', async () => {
    await addStock(org.user, 'O+', 900);
    await record(org.token, { inventoryType: 'out', bloodGroup: 'O+', quantity: 450, email: hospital.user.email }).expect(201);

    for (const [token, path] of [
      [org.token, '/api/v1/inventory'],
      [org.token, '/api/v1/inventory/donors'],
      [org.token, '/api/v1/inventory/hospitals'],
      [hospital.token, '/api/v1/inventory/history'],
      [hospital.token, '/api/v1/inventory/organisations'],
    ]) {
      const res = await api().get(path).set(auth(token)).expect(200);
      const body = JSON.stringify(res.body);
      assert.doesNotMatch(body, /\$2[aby]\$/, path);
      assert.doesNotMatch(body, /"password"/, path);
    }
  });

  it('shows each organisation with its stock of a blood group', async () => {
    await addStock(org.user, 'O-', 900);
    const res = await api()
      .get('/api/v1/inventory/availability')
      .query({ bloodGroup: 'O-' })
      .set(auth(hospital.token))
      .expect(200);
    assert.equal(res.body.organisations[0].organisation._id, String(org.user._id));
    assert.equal(res.body.organisations[0].available, 900);
  });
});
