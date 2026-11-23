import { MongoServerError, type Filter } from 'mongodb';
import { mongo } from '../../lib/mongo.js';
import type { AuditEvent } from './audit.types.js';

const auditEvents = () => mongo().collection<AuditEvent>('audit_events');

/** Insert, treating "already exists" as success. Safe to call twice for the same event. */
export async function insertAuditEvent(event: AuditEvent): Promise<void> {
  try {
    await auditEvents().insertOne(event);
  } catch (err) {
    if (err instanceof MongoServerError && err.code === 11000) return; // duplicate _id
    throw err;
  }
}

export interface AuditPageCursor {
  at: Date;
  id: string;
}

/** Keyset pagination on (at desc, _id desc), served by the by_subject_time index. */
export async function listAuditForCustomer(customerId: string, limit: number, cursor?: AuditPageCursor) {
  const filter: Filter<AuditEvent> = { 'subject.customerId': customerId };
  if (cursor) {
    filter.$or = [{ at: { $lt: cursor.at } }, { at: cursor.at, _id: { $lt: cursor.id } }];
  }
  return auditEvents()
    .find(filter, { projection: { subject: 0 } })
    .sort({ at: -1, _id: -1 })
    .limit(limit)
    .toArray();
}