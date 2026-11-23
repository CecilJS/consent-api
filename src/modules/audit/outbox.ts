import type { Tx } from '../../lib/prisma.js';
import type { AuditInput } from './audit.types.js';

/**
 * Write an audit event into the Postgres outbox using the SAME transaction as the
 * business change. Either both commit or neither does. The relay ships it to Mongo later.
 */
export async function recordAudit(tx: Tx, input: AuditInput): Promise<void> {
  await tx.outboxEvent.create({
    data: {
      type: input.type,
      payload: {
        at: new Date().toISOString(),
        actor: { ...input.actor },
        customerId: input.customerId,
        data: input.data as Record<string, string | number | boolean | null>,
        ...(input.requestId ? { requestId: input.requestId } : {}),
      },
    },
  });
}