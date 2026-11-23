import type { ErrorRequestHandler, RequestHandler } from 'express';
import { AppError } from '../lib/errors.js';

export const notFoundHandler: RequestHandler = (req) => {
  throw new AppError(404, 'ROUTE_NOT_FOUND', `No route for ${req.method} ${req.path}`);
};

export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  let status = 500;
  let code = 'INTERNAL_ERROR';
  let message = 'Something went wrong';
  let errors: unknown;

  if (err instanceof AppError) {
    ({ status, code, message } = err);
    errors = err.details;
  }

  if (status >= 500) req.log.error({ err }, 'request failed');

  // RFC 9457 problem details. Never leak stack traces or raw DB errors to clients.
  res
    .status(status)
    .type('application/problem+json')
    .json({ type: `urn:consent-api:error:${code}`, title: message, status, code, errors, requestId: req.id });
};