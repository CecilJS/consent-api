import { MongoError, MongoNetworkError, MongoServerSelectionError } from 'mongodb';
import { prisma } from '../../lib/prisma.js';
import { logger } from '../../lib/logger.js';
import { insertAuditEvent } from './audit.repository.js';
import type { Actor } from './audit.types.js';

const MAX_ATTEMPTS = 10;
const MAX_BACKOFF_MS = 30_000;

interface OutboxRow {
  id: string;
  type: string;
  payload: { at: string; actor: Actor; customerId: string; data: Record<string, unknown>; requestId?: string };
}

/** Mongo is unreachable (not "this event is bad"): retry later without burning attempts. */
const isTransient = (err: unknown) =>
  err instanceof MongoNetworkError ||
  err instanceof MongoServerSelectionError ||
  (err instanceof MongoError && err.hasErrorLabel('RetryableWriteError'));

/** Publish one batch. Returns how many rows were fetched and how many were published. */
export async function relayOnce(batchSize = 50): Promise<{ fetched: number; published: number }> {
  return prisma.$transaction(
    async (tx) => {
      // SKIP LOCKED lets several API instances run the relay without double-processing rows.
      const rows = await tx.$queryRaw<OutboxRow[]>`
        SELECT id, type, payload
        FROM "OutboxEvent"
        WHERE "publishedAt" IS NULL AND attempts < ${MAX_ATTEMPTS}
        ORDER BY "createdAt"
        LIMIT ${batchSize}
        FOR UPDATE SKIP LOCKED`;

      let published = 0;
      for (const row of rows) {
        try {
          await insertAuditEvent({
            _id: row.id,
            type: row.type,
            at: new Date(row.payload.at),
            actor: row.payload.actor,
            subject: { customerId: row.payload.customerId },
            data: row.payload.data,
            requestId: row.payload.requestId,
          });
          await tx.outboxEvent.update({ where: { id: row.id }, data: { publishedAt: new Date() } });
          published++;
        } catch (err) {
          // Outage: abort the batch. The Postgres transaction rolls back; events already in Mongo
          // are re-sent next time and ignored as duplicates, so nothing is lost or doubled.
          if (isTransient(err)) throw err;
          // Permanent failure for THIS event (e.g. fails schema validation): count it toward dead-lettering.
          await tx.outboxEvent.update({
            where: { id: row.id },
            data: { attempts: { increment: 1 }, lastError: String(err).slice(0, 500) },
          });
        }
      }
      return { fetched: rows.length, published };
    },
    { timeout: 15_000 },
  );
}

/** Poll the outbox. Returns a stop function for graceful shutdown. */
export function startOutboxRelay(intervalMs = 1_000): () => void {
  let stopped = false;
  let timer: NodeJS.Timeout | undefined;
  let failures = 0;

  const tick = async () => {
    let delay = intervalMs;
    try {
      const { fetched, published } = await relayOnce();
      failures = 0;
      // A fully-published batch means there may be more waiting: go again immediately.
      if (fetched > 0 && published === fetched) delay = 0;
    } catch (err) {
      failures++;
      delay = Math.min(MAX_BACKOFF_MS, intervalMs * 2 ** failures); // exponential backoff
      logger.error({ err, failures, retryInMs: delay }, 'outbox relay tick failed');
    }
    if (!stopped) timer = setTimeout(tick, delay);
  };

  timer = setTimeout(tick, intervalMs);
  return () => {
    stopped = true;
    if (timer) clearTimeout(timer);
  };
}