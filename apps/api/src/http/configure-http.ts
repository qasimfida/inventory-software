import { randomUUID } from 'node:crypto';
import { Logger, ValidationPipe } from '@nestjs/common';
import type { INestApplication } from '@nestjs/common';
import type { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import { json, urlencoded } from 'express';
import { API_PREFIX } from '@inventory/contracts';
import type { Environment } from '../config/environment.js';
import { ApiErrorFilter } from './error.filter.js';

export function configureHttp(app: INestApplication, environment: Environment) {
  const logger = new Logger('HTTP');
  app.use((request: Request, response: Response, next: NextFunction) => {
    const requestId = randomUUID();
    const started = performance.now();
    response.setHeader('x-request-id', requestId);
    response.setHeader('cache-control', 'no-store');
    response.on('finish', () =>
      logger.log({
        requestId,
        method: request.method,
        status: response.statusCode,
        durationMs: Math.round(performance.now() - started),
      }),
    );
    next();
  });
  app.use(helmet());
  app.use(json({ limit: environment.REQUEST_BODY_LIMIT_BYTES }));
  app.use(
    urlencoded({
      extended: false,
      limit: environment.REQUEST_BODY_LIMIT_BYTES,
      parameterLimit: 100,
    }),
  );
  app.enableCors({ origin: environment.corsOrigins, credentials: true });
  app.use((request: Request, response: Response, next: NextFunction) => {
    if (request.path.startsWith(`${API_PREFIX}/`) && request.path !== `${API_PREFIX}/`)
      return next();
    response.status(404).json({
      code: 'NOT_FOUND',
      message: 'Resource not found.',
      requestId: String(response.getHeader('x-request-id')),
      retryable: false,
    });
  });
  app.setGlobalPrefix(API_PREFIX.slice(1));
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      forbidUnknownValues: true,
      validationError: { target: false, value: false },
    }),
  );
  app.useGlobalFilters(new ApiErrorFilter());
}
