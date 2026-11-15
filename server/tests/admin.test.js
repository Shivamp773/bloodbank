import { after, before, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { api, auth, clearDb, createUser, daysFromNow, startDb, stopDb } from './helpers.js';
import { Appointment } from '../models/appointmentModel.js';
import { Inventory } from '../models/inventoryModel.js';
import { User } from '../models/userModel.js';

describe('Admin', () => {
  let admin;

  before(startDb);
  after(stopDb);
  beforeEach(async () => {
    await clearDb();
    admin = await createUser('admin');
  });

  it('is admin-only', async () => {
    const org = await createUser('organisation');
    await api().get('/api/v1/admin/users').query({ role: 'donor' }).set(auth(org.token)).expect(403);
    await api().get('/api/v1/admin/overview').expect(401);
  });

  it('lists users by role without password hashes', async () => {
    await createUser('donor');
    await createUser('donor');
    await createUser('hospital');
    const res = await api().get('/api/v1/admin/users').query({ role: 'donor' }).set(auth(admin.token)).expect(200);
    assert.equal(res.body.total, 2);
    assert.doesNotMatch(JSON.stringify(res.body), /password|\$2[aby]\$/);
    await api().get('/api/v1/admin/users').query({ role: 'admin' }).set(auth(admin.token)).expect(400);
  });

  it('deletes a donor, keeps their past records and cancels their appointment', async () => {
    const org = await createUser('organisation');
    const donor = await createUser('donor');
    await Inventory.create({
      inventoryType: 'in',
      bloodGroup: 'O+',
      quantity: 450,
      email: donor.user.email,
      organisation: org.user._id,
      donor: donor.user._id,
    });
    const appointment = await Appointment.create({
      donor: donor.user._id,
      organisation: org.user._id,
      scheduledAt: daysFromNow(3),
    });

    const res = await api().delete(`/api/v1/admin/users/${donor.user._id}`).set(auth(admin.token)).expect(200);
    assert.equal(res.body.message, 'Test Donor was deleted');
    assert.equal(await User.exists({ _id: donor.user._id }), null);
    assert.equal(await Inventory.countDocuments({ donor: donor.user._id }), 1);
    assert.equal((await Appointment.findById(appointment._id)).status, 'cancelled');
  });

  it("refuses to delete itself or another admin, and checks the id", async () => {
    const otherAdmin = await createUser('admin');
    await api().delete(`/api/v1/admin/users/${admin.user._id}`).set(auth(admin.token)).expect(400);
    await api().delete(`/api/v1/admin/users/${otherAdmin.user._id}`).set(auth(admin.token)).expect(403);
    await api().delete('/api/v1/admin/users/not-an-id').set(auth(admin.token)).expect(400);
    await api()
      .delete(`/api/v1/admin/users/${new mongoose.Types.ObjectId()}`)
      .set(auth(admin.token))
      .expect(404);
  });

  it('summarises the whole system', async () => {
    await createUser('organisation');
    await createUser('hospital');
    await createUser('donor');
    const res = await api().get('/api/v1/admin/overview').set(auth(admin.token)).expect(200);
    assert.deepEqual(res.body.counts, { donor: 1, hospital: 1, organisation: 1, admin: 1 });
    assert.equal(res.body.stock.length, 8);
    assert.equal(res.body.trend.length, 30);
    assert.equal(res.body.recentUsers.length, 3);
  });
});
