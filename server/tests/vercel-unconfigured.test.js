import './setup-env.js';
import { before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';

describe('Vercel serverless handler without configuration', () => {
  let handler;

  before(async () => {
    // Empty values also win over a local .env file, so this test is independent of the machine.
    process.env.MONGO_URL = '';
    process.env.JWT_SECRET = '';
    ({ default: handler } = await import('../vercel.js'));
  });

  it('explains which environment variables are missing instead of crashing', async () => {
    const res = await request(handler).get('/api/v1/meta').expect(503);
    assert.equal(res.body.success, false);
    assert.match(res.body.message, /MONGO_URL and JWT_SECRET/);
    assert.match(res.body.message, /Vercel project settings/);
  });
});
