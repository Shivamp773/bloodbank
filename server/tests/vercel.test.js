import './setup-env.js';
import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import request from 'supertest';

// The Vercel entry point reads MONGO_URL and JWT_SECRET at import time, so they are set first.
describe('Vercel serverless handler', () => {
  let mongod;
  let handler;

  before(async () => {
    mongod = await MongoMemoryServer.create();
    process.env.MONGO_URL = mongod.getUri('bloodbank-vercel');
    process.env.JWT_SECRET = 'test-secret-that-is-long-enough-for-hs256';
    ({ default: handler } = await import('../vercel.js'));
  });

  after(async () => {
    await mongoose.disconnect();
    await mongod.stop();
  });

  it('connects to the database on the first request and serves the API', async () => {
    const health = await request(handler).get('/api/v1/meta/health').expect(200);
    assert.equal(health.body.database, 'connected');
  });

  it('handles a full register and login round trip', async () => {
    await request(handler)
      .post('/api/v1/auth/register')
      .send({
        role: 'hospital',
        hospitalName: 'Serverless General',
        email: 'serverless@test.dev',
        password: 'Password123',
        address: '1 Cloud Road',
        phone: '+91 98765 43210',
      })
      .expect(201);
    const login = await request(handler)
      .post('/api/v1/auth/login')
      .send({ email: 'serverless@test.dev', password: 'Password123', role: 'hospital' })
      .expect(200);
    assert.ok(login.body.token);
  });

  it('answers unknown API routes with a JSON 404', async () => {
    const res = await request(handler).get('/api/v1/missing').expect(404);
    assert.equal(res.body.success, false);
  });
});
