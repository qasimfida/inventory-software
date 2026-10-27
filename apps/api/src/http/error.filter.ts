import { StorefrontConflict, storefrontConflicts } from '../storefront/storefront-errors.js';
import { PricingConflict, pricingConflicts } from './pricing-conflict.js';
import type { AuthRequest } from '../auth/auth.http.js';
import type { Environment } from '../config/environment.js';
import type { DatabaseService } from '../database/database.service.js';
import { diagnosticMetadata, persistDiagnostic } from '../logging/diagnostic.js';
import { Catch, HttpException, Logger } from '@nestjs/common';
import type { ArgumentsHost, ExceptionFilter } from '@nestjs/common';
import type { Response } from 'express';
import type { ApiErrorResponse } from '@inventory/contracts';

@Catch()
export class ApiErrorFilter implements ExceptionFilter {
  private readonly logger = new Logger(ApiErrorFilter.name);

  constructor(
    private readonly environment?: Environment,
    private readonly database?: DatabaseService,
  ) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();
    const status = httpStatus(exception);
    const requestId = String(response.getHeader('x-request-id'));
    const code =
      exception instanceof StorefrontConflict
        ? exception.publicCode
        : exception instanceof PricingConflict
          ? exception.publicCode
          : status === 409
            ? 'CONFLICT'
            : status === 401
              ? 'UNAUTHENTICATED'
              : status === 403
                ? 'FORBIDDEN'
                : status === 429
                  ? 'RATE_LIMITED'
                  : status === 400
                    ? 'BAD_REQUEST'
                    : status === 404
                      ? 'NOT_FOUND'
                      : status === 503
                        ? 'UNAVAILABLE'
                        : status >= 500
                          ? 'INTERNAL_ERROR'
                          : 'REQUEST_FAILED';
    const message =
      exception instanceof StorefrontConflict
        ? storefrontConflicts[exception.publicCode]
        : exception instanceof PricingConflict
          ? pricingConflicts[exception.publicCode]
          : status === 409
            ? 'The record changed, a code is in use, or this state transition is not allowed.'
            : status === 401
              ? 'Authentication required or credentials invalid.'
              : status === 403
                ? 'Request not allowed.'
                : status === 429
                  ? 'Too many attempts. Try again later.'
                  : status === 400
                    ? 'Request validation failed.'
                    : status === 404
                      ? 'Resource not found.'
                      : status >= 500
                        ? 'Service unavailable.'
                        : 'Request could not be completed.';
    if (this.environment) {
      const event = diagnosticMetadata(
        host.switchToHttp().getRequest<AuthRequest>(),
        status,
        code,
        requestId,
        this.environment,
        exception,
      );
      if (status >= 500) {
        this.logger.error(event);
        if (this.database)
          void persistDiagnostic(this.database, event).catch(() => {
            this.logger.error({ event: 'diagnostics.persistence_unavailable', requestId });
          });
      } else this.logger.warn(event);
    } else if (status >= 500) this.logger.error({ code, requestId, status });
    const body: ApiErrorResponse = { code, message, requestId, retryable: status === 503 };
    if (status === 400 && exception instanceof HttpException) {
      const detail = exception.getResponse();
      if (
        typeof detail === 'object' &&
        detail !== null &&
        'fields' in detail &&
        Array.isArray(detail.fields)
      )
        body.fields = detail.fields as { path: string; code: string }[];
    }
    if (status === 429) response.setHeader('retry-after', '900');
    response.status(status).json(body);
  }
}

function httpStatus(exception: unknown): number {
  if (exception instanceof HttpException) return exception.getStatus();
  // Express parser errors are not Nest HttpExceptions (for example a 413 body limit).
  if (typeof exception === 'object' && exception !== null && 'status' in exception) {
    const status = exception.status;
    if (typeof status === 'number' && Number.isInteger(status) && status >= 400 && status <= 599)
      return status;
  }
  return 500;
}
