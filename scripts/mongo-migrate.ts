// Runs with ADMIN credentials (MONGO_ADMIN_URL). The app's own user can't change schemas.
import 'dotenv/config';
import { MongoClient } from 'mongodb';

const adminUrl = process.env.MONGO_ADMIN_URL;
const dbName = process.env.MONGO_DB ?? 'consent_audit';
if (!adminUrl) throw new Error('MONGO_ADMIN_URL is required');

const auditValidator = {
  $jsonSchema: {
    bsonType: 'object',
    required: ['_id', 'type', 'at', 'actor', 'subject', 'data'],
    properties: {
      _id: { bsonType: 'string' },
      type: { bsonType: 'string', pattern: '^[a-z_]+\\.[a-z_]+$' },
      at: { bsonType: 'date' },
      actor: {
        bsonType: 'object',
        required: ['id', 'kind'],
        properties: {
          id: { bsonType: 'string' },
          kind: { enum: ['user', 'service', 'system'] },
          role: { bsonType: 'string' },
        },
      },
      subject: {
        bsonType: 'object',
        required: ['customerId'],
        properties: { customerId: { bsonType: 'string' } },
      },
      data: { bsonType: 'object' },
      requestId: { bsonType: 'string' },
    },
  },
};

const client = new MongoClient(adminUrl);
try {
  await client.connect();
  const db = client.db(dbName);

  async function ensureCollection(name: string, validator?: object) {
    const exists = (await db.listCollections({ name }).toArray()).length > 0;
    const opts = validator ? { validator, validationLevel: 'strict', validationAction: 'error' } : {};
    if (!exists) await db.createCollection(name, opts);
    else if (validator) await db.command({ collMod: name, ...opts }); // re-runnable: updates the validator
  }

  await ensureCollection('audit_events', auditValidator);
  await db.collection('audit_events').createIndexes([
    { key: { 'subject.customerId': 1, at: -1, _id: -1 }, name: 'by_subject_time' },
    { key: { 'actor.id': 1, at: -1 }, name: 'by_actor_time' },
    { key: { type: 1, at: -1 }, name: 'by_type_time' },
  ]);

  await ensureCollection('idempotency_keys');
  // TTL index: Mongo deletes each record once expiresAt has passed (checked about every 60s).
  await db.collection('idempotency_keys').createIndex({ expiresAt: 1 }, { name: 'ttl', expireAfterSeconds: 0 });

  console.log(`Mongo schema ready in "${dbName}"`);
} finally {
  await client.close();
}