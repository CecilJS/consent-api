import express from 'express';
import { httpLogger } from './middleware/httpLogger.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';

export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.use(httpLogger);
  app.use(express.json({ limit: '10kb' }));

  app.get('/health/live', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}