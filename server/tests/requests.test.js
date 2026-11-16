import { after, before, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { addStock, api, auth, clearDb, createUser, startDb, stopDb } from './helpers.js';
import { BloodRequest } from '../models/requestModel.js';
import { Inventory } from '../models/inventoryModel.js';
import { getAvailable } from '../services/stockService.js';

describe('Blood requests', () => {
  let org;
  let hospital;

  before(startDb);
  after(stopDb);
  beforeEach(async () => {
    await clearDb();
    org = await createUser('organisation');
    hospital = await createUser('hospital');
    await addStock(org.user, 'O+', 900);
  });

  const createRequest = (body = {}) =>
    api()
      .post('/api/v1/requests')
      .set(auth(hospital.token))
      .send({ organisation: String(org.user._id), bloodGroup: 'O+', quantity: 450, ...body });
  const act = (token, id, action, body = {}) =>
    api().patch(`/api/v1/requests/${id}/${action}`).set(auth(token)).send(body);

  it('lets a hospital request blood from an organisation', async () => {
    const res = await createRequest({ urgency: 'urgent', note: 'Surgery tomorrow' }).expect(201);
    assert.equal(res.body.request.status, 'pending');
    assert.equal(res.body.request.urgency, 'urgent');
    assert.equal(res.body.request.organisation._id, String(org.user._id));
  });

  it('accepts only organisations as the recipient, and only hospitals as the sender', async () => {
    const donor = await createUser('donor');
    await createRequest({ organisation: String(donor.user._id) }).expect(404);
    await api()
      .post('/api/v1/requests')
      .set(auth(donor.token))
      .send({ organisation: String(org.user._id), bloodGroup: 'O+', quantity: 450 })
      .expect(403);
  });

  it('approving issues the blood and links the OUT record', async () => {
    const { body } = await createRequest().expect(201);
    const res = await act(org.token, body.request._id, 'approve').expect(200);
    assert.equal(res.body.request.status, 'approved');

    const out = await Inventory.findOne({ request: body.request._id });
    assert.equal(out.inventoryType, 'out');
    assert.equal(String(out.hospital), String(hospital.user._id));
    assert.equal(await getAvailable(org.user._id, 'O+'), 450);
  });

  it('keeps the request pending when there is not enough stock', async () => {
    const { body } = await createRequest({ quantity: 1350 }).expect(201);
    const res = await act(org.token, body.request._id, 'approve').expect(409);
    assert.equal(res.body.message, 'Only 900 ml of O+ is available');

    const after = await BloodRequest.findById(body.request._id);
    assert.equal(after.status, 'pending');
    assert.equal(await Inventory.countDocuments({ inventoryType: 'out' }), 0);
  });

  it('approves only once when the button is clicked several times at once', async () => {
    const { body } = await createRequest().expect(201);
    const results = await Promise.all([1, 2, 3].map(() => act(org.token, body.request._id, 'approve')));
    assert.equal(results.filter((r) => r.status === 200).length, 1);
    assert.equal(await Inventory.countDocuments({ request: body.request._id }), 1);
  });

  it('lets the organisation reject with a reason and the hospital cancel', async () => {
    const first = (await createRequest().expect(201)).body.request;
    const rejected = await act(org.token, first._id, 'reject', { responseNote: 'Out of stock' }).expect(200);
    assert.equal(rejected.body.request.status, 'rejected');
    assert.equal(rejected.body.request.responseNote, 'Out of stock');

    const second = (await createRequest().expect(201)).body.request;
    await act(hospital.token, second._id, 'cancel').expect(200);
    const again = await act(hospital.token, second._id, 'cancel').expect(409);
    assert.match(again.body.message, /already cancelled/);
  });

  it("hides requests from organisations they weren't sent to", async () => {
    const other = await createUser('organisation');
    const { body } = await createRequest().expect(201);
    await act(other.token, body.request._id, 'approve').expect(404);
    const list = await api().get('/api/v1/requests').set(auth(other.token)).expect(200);
    assert.equal(list.body.requests.length, 0);
  });

  it("shows the organisation's current stock next to each request, and counts by status", async () => {
    await createRequest().expect(201);
    const list = await api().get('/api/v1/requests').set(auth(org.token)).expect(200);
    assert.equal(list.body.requests[0].availableMl, 900);

    const stats = await api().get('/api/v1/requests/stats').set(auth(org.token)).expect(200);
    assert.deepEqual(stats.body.stats, { pending: 1, approved: 0, rejected: 0, cancelled: 0 });
  });
});
