import type { ErrorRequestHandler, RequestHandler } from 'express';
import { AppError } from '../lib/errors.js';

export const notFoundHandler: RequestHandler = (req) => {
  throw new AppError(404, 'ROUTE_NOT_FOUND', `No route for ${req.method} ${req.path}`);
};

export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  const status = err instanceof AppError ? err.status : 500;
  if (status >= 500) req.log.error({ err }, 'request failed');
  res.status(status).json({ code: err.code ?? 'INTERNAL_ERROR', requestId: req.id });
};