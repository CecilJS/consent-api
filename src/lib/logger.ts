import { pino } from 'pino';
import { env } from '../config/env.js';

export const logger = pino({
  level: env.NODE_ENV === 'test' ? 'silent' : env.LOG_LEVEL,
  base: { service: 'consent-api' },
  // Belt and braces: even if someone logs a whole object, secrets are masked.
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'req.headers["x-api-key"]',
      '*.password',
      '*.passwordHash',
      '*.refreshToken',
      '*.accessToken',
    ],
    censor: '[REDACTED]',
  },
  ...(env.NODE_ENV === 'development' ? { transport: { target: 'pino-pretty' } } : {}),
});