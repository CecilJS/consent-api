export interface Actor {
  id: string;
  kind: 'user' | 'service' | 'system';
  role?: string;
}

export interface AuditEvent {
  _id: string; // = OutboxEvent.id, which makes re-delivery idempotent
  type: string; // "<entity>.<verb>", e.g. "grant.created"
  at: Date;
  actor: Actor;
  subject: { customerId: string };
  data: Record<string, unknown>;
  requestId?: string;
}

export interface AuditInput {
  type: string;
  actor: Actor;
  customerId: string;
  data: Record<string, unknown>;
  requestId?: string;
}