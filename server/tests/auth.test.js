import { after, before, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { api, auth, clearDb, createUser, startDb, stopDb } from './helpers.js';
import { User } from '../models/userModel.js';

const donorForm = {
  role: 'donor',
  name: 'Asha Rao',
  email: '  Asha@Example.com ',
  password: 'Password123',
  address: '12 Main Road',
  phone: '+91 98765 43210',
  bloodGroup: 'B+',
};

describe('Auth', () => {
  before(startDb);
  after(stopDb);
  beforeEach(clearDb);

  it('registers a donor and never returns the password hash', async () => {
    const res = await api().post('/api/v1/auth/register').send(donorForm).expect(201);
    assert.equal(res.body.success, true);
    assert.equal(res.body.user.email, 'asha@example.com');
    assert.equal(res.body.user.password, undefined);

    const stored = await User.findOne({ email: 'asha@example.com' }).select('+password');
    assert.match(stored.password, /^\$2[aby]\$/);
  });

  it('refuses self-registration as admin', async () => {
    const res = await api().post('/api/v1/auth/register').send({ ...donorForm, role: 'admin' }).expect(400);
    assert.match(res.body.message, /donor, hospital or organisation/);
    assert.equal(await User.countDocuments(), 0);
  });

  it('rejects a duplicate email regardless of letter case', async () => {
    await api().post('/api/v1/auth/register').send(donorForm).expect(201);
    const res = await api()
      .post('/api/v1/auth/register')
      .send({ ...donorForm, email: 'ASHA@example.com' })
      .expect(409);
    assert.match(res.body.message, /already exists/);
  });

  it('requires the name field that matches the role', async () => {
    const res = await api()
      .post('/api/v1/auth/register')
      .send({ ...donorForm, role: 'hospital' })
      .expect(400);
    assert.equal(res.body.message, 'Hospital name is required');
  });

  it('validates email, password length and phone number', async () => {
    const res = await api()
      .post('/api/v1/auth/register')
      .send({ ...donorForm, email: 'not-an-email', password: 'short', phone: 'call me' })
      .expect(400);
    assert.deepEqual(res.body.errors.map((e) => e.field).sort(), ['email', 'password', 'phone']);
  });

  it('logs in with the right role and returns a token', async () => {
    await createUser('donor', { email: 'donor@test.dev' });
    const res = await api()
      .post('/api/v1/auth/login')
      .send({ email: 'DONOR@test.dev', password: 'Password123', role: 'donor' })
      .expect(200);
    assert.ok(res.body.token);
    assert.equal(res.body.user.password, undefined);
  });

  it('gives the same answer for an unknown email and a wrong password', async () => {
    await createUser('donor', { email: 'donor@test.dev' });
    const unknown = await api()
      .post('/api/v1/auth/login')
      .send({ email: 'nobody@test.dev', password: 'Password123', role: 'donor' })
      .expect(401);
    const wrong = await api()
      .post('/api/v1/auth/login')
      .send({ email: 'donor@test.dev', password: 'WrongPassword', role: 'donor' })
      .expect(401);
    assert.equal(unknown.body.message, wrong.body.message);
  });

  it('only reveals a role mismatch after the password is verified', async () => {
    await createUser('hospital', { email: 'hospital@test.dev' });
    await api()
      .post('/api/v1/auth/login')
      .send({ email: 'hospital@test.dev', password: 'nope', role: 'donor' })
      .expect(401);
    const res = await api()
      .post('/api/v1/auth/login')
      .send({ email: 'hospital@test.dev', password: 'Password123', role: 'donor' })
      .expect(403);
    assert.match(res.body.message, /registered as a hospital/);
  });

  it('rejects query-operator injection in the login form', async () => {
    await createUser('donor');
    await api()
      .post('/api/v1/auth/login')
      .send({ email: { $ne: null }, password: { $ne: null }, role: 'donor' })
      .expect(400);
  });

  it('returns the current user for a valid token and 401 otherwise', async () => {
    const { user, token } = await createUser('donor');
    const res = await api().get('/api/v1/auth/current-user').set(auth(token)).expect(200);
    assert.equal(res.body.user._id, String(user._id));
    assert.equal(res.body.user.password, undefined);

    await api().get('/api/v1/auth/current-user').expect(401);
    await api().get('/api/v1/auth/current-user').set('Authorization', 'Bearer not-a-token').expect(401);

    await User.deleteOne({ _id: user._id });
    await api().get('/api/v1/auth/current-user').set(auth(token)).expect(401);
  });
});
