import mongoose from 'mongoose';
import { config } from './env.js';

let memoryServer = null;

/**
 * Connects to MONGO_URL, or (outside production) starts a temporary in-memory MongoDB.
 * Returns `{ demo }`, where `demo` is true when the in-memory database is used.
 */
export async function connectDB() {
  mongoose.set('strictQuery', true);

  let uri = config.mongoUrl;
  let demo = false;

  if (!uri) {
    if (config.isProduction) {
      throw new Error('MONGO_URL must be set when NODE_ENV=production.');
    }
    let MongoMemoryServer;
    try {
      // Dev-only package; vercel.json excludes it from the serverless bundle, where MONGO_URL is required.
      ({ MongoMemoryServer } = await import('mongodb-memory-server'));
    } catch {
      throw new Error(
        'MONGO_URL is not set and the built-in demo database is not installed. ' +
          'Run "npm install" (including dev dependencies) or set MONGO_URL in .env.',
      );
    }
    memoryServer = await MongoMemoryServer.create();
    uri = memoryServer.getUri('bloodbank');
    demo = true;
  }

  await mongoose.connect(uri, { serverSelectionTimeoutMS: 10_000 });
  return { demo };
}

export async function disconnectDB() {
  await mongoose.disconnect();
  if (memoryServer) {
    await memoryServer.stop();
    memoryServer = null;
  }
}
