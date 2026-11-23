import { MongoClient, type Db } from 'mongodb';
import { env } from '../config/env.js';

export const mongoClient = new MongoClient(env.MONGO_URL, {
  appName: 'consent-api',
  maxPoolSize: 10,
  serverSelectionTimeoutMS: 5_000,
  // Without this, `undefined` fields are stored as null and fail schema validation.
  ignoreUndefined: true,
});

let db: Db | undefined;

export async function connectMongo(): Promise<Db> {
  await mongoClient.connect();
  db = mongoClient.db(env.MONGO_DB);
  return db;
}

export function mongo(): Db {
  if (!db) throw new Error('MongoDB is not connected. Call connectMongo() first.');
  return db;
}