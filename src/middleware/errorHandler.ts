import type { ErrorRequestHandler, RequestHandler } from 'express';
import { ZodError } from 'zod';
import { Prisma } from '../generated/prisma/client.js';
import { AppError } from '../lib/errors.js';

export const notFoundHandler: RequestHandler = (req) => {
  throw new AppError(404, 'ROUTE_NOT_FOUND', `No route for ${req.method} ${req.path}`);
};

interface Problem {
  status: number;
  code: string;
  message: string;
  errors?: unknown;
}

const INTERNAL: Problem = { status: 500, code: 'INTERNAL_ERROR', message: 'Something went wrong' };

// Known database errors we can explain to the client. Anything else stays a 500.
const PRISMA_ERRORS: Record<string, Problem> = {
  P2002: { status: 409, code: 'CONFLICT', message: 'A record with these values already exists' },
  P2025: { status: 404, code: 'NOT_FOUND', message: 'Resource not found' },
};

// Errors thrown by express.json() (body-parser), identified by their `type`.
const BODY_PARSER_ERRORS: Record<string, Problem> = {
  'entity.too.large': { status: 413, code: 'PAYLOAD_TOO_LARGE', message: 'Request body is too large' },
  'entity.parse.failed': { status: 400, code: 'MALFORMED_JSON', message: 'Request body is not valid JSON' },
};

/** Translate any thrown value into the problem we show the client. Pure: easy to unit test. */
export function toProblem(err: unknown): Problem {
  if (err instanceof AppError) {
    return { status: err.status, code: err.code, message: err.message, errors: err.details };
  }
  if (err instanceof ZodError) {
    return {
      status: 400,
      code: 'VALIDATION_FAILED',
      message: 'Request validation failed',
      errors: err.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
    };
  }
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    return PRISMA_ERRORS[err.code] ?? INTERNAL;
  }
  const type = (err as { type?: unknown } | null)?.type;
  if (typeof type === 'string') return BODY_PARSER_ERRORS[type] ?? INTERNAL;
  return INTERNAL;
}

export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  const { status, code, message, errors } = toProblem(err);

  if (status >= 500) req.log.error({ err }, 'request failed');

  // RFC 9457 problem details. Never leak stack traces or raw DB errors to clients.
  res
    .status(status)
    .type('application/problem+json')
    .json({ type: `urn:consent-api:error:${code}`, title: message, status, code, errors, requestId: req.id });
};