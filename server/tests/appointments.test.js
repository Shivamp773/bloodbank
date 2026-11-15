import { after, before, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { api, auth, clearDb, createUser, daysAgo, daysFromNow, startDb, stopDb } from './helpers.js';
import { Appointment } from '../models/appointmentModel.js';
import { Inventory } from '../models/inventoryModel.js';
import { User } from '../models/userModel.js';

describe('Appointments', () => {
  let org;
  let donor;

  before(startDb);
  after(stopDb);
  beforeEach(async () => {
    await clearDb();
    org = await createUser('organisation');
    donor = await createUser('donor');
  });

  const book = (token, body = {}) =>
    api()
      .post('/api/v1/appointments')
      .set(auth(token))
      .send({ organisation: String(org.user._id), scheduledAt: daysFromNow(2).toISOString(), ...body });
  const act = (token, id, action, body = {}) =>
    api().patch(`/api/v1/appointments/${id}/${action}`).set(auth(token)).send(body);
  const donatedDaysAgo = (days) =>
    Inventory.create({
      inventoryType: 'in',
      bloodGroup: 'A+',
      quantity: 450,
      email: donor.user.email,
      organisation: org.user._id,
      donor: donor.user._id,
      createdAt: daysAgo(days),
    });

  it('books an appointment for an eligible donor', async () => {
    const res = await book(donor.token, { note: 'Morning works best' }).expect(201);
    assert.equal(res.body.appointment.status, 'scheduled');
    assert.equal(res.body.appointment.organisation.organisationName, 'Test Organisation');
  });

  it('rejects dates in the past or too far ahead', async () => {
    await book(donor.token, { scheduledAt: daysAgo(1).toISOString() }).expect(400);
    await book(donor.token, { scheduledAt: daysFromNow(120).toISOString() }).expect(400);
    await book(donor.token, { scheduledAt: 'next tuesday' }).expect(400);
  });

  it('allows only one upcoming appointment per donor', async () => {
    await book(donor.token).expect(201);
    const res = await book(donor.token, { scheduledAt: daysFromNow(5).toISOString() }).expect(409);
    assert.match(res.body.message, /already have an upcoming appointment/);
  });

  it('refuses dates before the donor is eligible again', async () => {
    await donatedDaysAgo(10);
    const res = await book(donor.token, { scheduledAt: daysFromNow(5).toISOString() }).expect(409);
    assert.match(res.body.message, /You can donate again from/);
    await book(donor.token, { scheduledAt: daysFromNow(81).toISOString() }).expect(201);
  });

  it('completing records the donation exactly once', async () => {
    const { body } = await book(donor.token).expect(201);
    const res = await act(org.token, body.appointment._id, 'complete', { bloodGroup: 'A+', quantity: 450 }).expect(200);
    assert.equal(res.body.appointment.status, 'completed');

    const record = await Inventory.findOne({ appointment: body.appointment._id });
    assert.equal(record.inventoryType, 'in');
    assert.equal(String(record.donor), String(donor.user._id));
    assert.equal((await User.findById(donor.user._id)).bloodGroup, 'O+'); // existing blood group kept

    await act(org.token, body.appointment._id, 'complete', { bloodGroup: 'A+', quantity: 450 }).expect(409);
    assert.equal(await Inventory.countDocuments({ appointment: body.appointment._id }), 1);
  });

  it('marks a no-show only after the appointment time', async () => {
    const { body } = await book(donor.token).expect(201);
    await act(org.token, body.appointment._id, 'no-show').expect(409);

    await Appointment.updateOne({ _id: body.appointment._id }, { scheduledAt: daysAgo(1) });
    const res = await act(org.token, body.appointment._id, 'no-show').expect(200);
    assert.equal(res.body.appointment.status, 'no-show');
  });

  it('lets the donor cancel, which frees them to book again', async () => {
    const { body } = await book(donor.token).expect(201);
    const res = await act(donor.token, body.appointment._id, 'cancel').expect(200);
    assert.equal(res.body.appointment.cancelledBy, 'donor');
    await book(donor.token).expect(201);
  });

  it('reports eligibility and donation totals to the donor', async () => {
    let res = await api().get('/api/v1/appointments/eligibility').set(auth(donor.token)).expect(200);
    assert.equal(res.body.eligible, true);
    assert.equal(res.body.lastDonationAt, null);

    await donatedDaysAgo(30);
    res = await api().get('/api/v1/appointments/eligibility').set(auth(donor.token)).expect(200);
    assert.equal(res.body.eligible, false);
    assert.equal(res.body.stats.donations, 1);
    assert.equal(res.body.stats.totalMl, 450);
  });

  it('keeps appointments private to their donor and organisation', async () => {
    const other = await createUser('organisation');
    const { body } = await book(donor.token).expect(201);
    await act(other.token, body.appointment._id, 'complete', { bloodGroup: 'A+', quantity: 450 }).expect(404);
    const list = await api().get('/api/v1/appointments').set(auth(other.token)).expect(200);
    assert.equal(list.body.appointments.length, 0);
  });
});
