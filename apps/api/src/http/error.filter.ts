import { Catch, HttpException, Logger } from '@nestjs/common';
import type { ArgumentsHost, ExceptionFilter } from '@nestjs/common';
import type { Response } from 'express';
import type { ApiErrorResponse } from '@inventory/contracts';

@Catch()
export class ApiErrorFilter implements ExceptionFilter {
  private readonly logger = new Logger(ApiErrorFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();
    const status = httpStatus(exception);
    const requestId = String(response.getHeader('x-request-id'));
    const code =
      status === 400
        ? 'BAD_REQUEST'
        : status === 404
          ? 'NOT_FOUND'
          : status === 503
            ? 'UNAVAILABLE'
            : status >= 500
              ? 'INTERNAL_ERROR'
              : 'REQUEST_FAILED';
    const message =
      status === 400
        ? 'Request validation failed.'
        : status === 404
          ? 'Resource not found.'
          : status >= 500
            ? 'Service unavailable.'
            : 'Request could not be completed.';
    if (status >= 500) this.logger.error({ code, requestId, status });
    const body: ApiErrorResponse = { code, message, requestId, retryable: status === 503 };
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
