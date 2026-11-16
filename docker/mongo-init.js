// Runs ONCE, on an empty data volume.
const dbName = process.env.MONGO_INITDB_DATABASE;
const appUser = process.env.MONGO_APP_USER;
const appPassword = process.env.MONGO_APP_PASSWORD;
if (!dbName || !appUser || !appPassword) throw new Error('Mongo init: app credentials not set');

db = db.getSiblingDB(dbName);

db.createRole({
  role: 'consentApp',
  privileges: [
    { resource: { db: dbName, collection: 'audit_events' }, actions: ['insert', 'find'] },
    { resource: { db: dbName, collection: 'idempotency_keys' }, actions: ['insert', 'find', 'update', 'remove'] },
  ],
  roles: [],
});

db.createUser({ user: appUser, pwd: appPassword, roles: ['consentApp'] });