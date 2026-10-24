import { randomUUID } from 'node:crypto';
import type { AuthRequest } from '../auth/auth.http.js';
import type { Environment } from '../config/environment.js';
import type { DatabaseService } from '../database/database.service.js';
const features = new Set([
  'auth',
  'settings',
  'sync',
  'sales',
  'inventory',
  'purchases',
  'purchasing',
  'payments',
  'customers',
  'catalog',
  'health',
  'counts',
  'transfers',
  'security',
]);
export function diagnosticMetadata(
  req: Partial<AuthRequest>,
  status: number,
  code: string,
  requestId: string,
  env: Environment,
  exception?: unknown,
) {
  // Do not record raw URLs, search strings, headers, messages, SQL, stacks or bodies.
  const parts = (req.path ?? '').split('/');
  const operation = parts.reverse().find((part) => features.has(part)) ?? 'api';
  const category = [401, 403, 429].includes(status)
    ? 'security'
    : status < 500
      ? 'validation'
      : 'application';
  return {
    id: randomUUID(),
    timestamp: new Date().toISOString(),
    environment: env.NODE_ENV,
    applicationVersion: env.APP_VERSION,
    requestId,
    code,
    category,
    operation,
    severity: status >= 500 ? 'error' : 'warning',
    retryable: status === 503,
    actorId: req.identity?.account_id ?? null,
    reason: status >= 500 ? diagnosticReason(exception) : 'REQUEST_REJECTED',
    recovery:
      status === 503
        ? 'Reconnect; review transaction status before retrying a mutation.'
        : status === 401
          ? 'Sign in again.'
          : status === 400
            ? 'Review the highlighted fields.'
            : 'Review access or contact support with the correlation ID.',
  };
}
export async function persistDiagnostic(
  db: DatabaseService,
  event: ReturnType<typeof diagnosticMetadata>,
) {
  await db.query(
    `INSERT INTO diagnostic_events(id,request_id,environment,application_version,code,category,operation,severity,retryable,actor_id,reason,recovery)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
    [
      event.id,
      event.requestId,
      event.environment,
      event.applicationVersion,
      event.code,
      event.category,
      event.operation,
      event.severity,
      event.retryable,
      event.actorId,
      event.reason,
      event.recovery,
    ],
  );
}

function diagnosticReason(error: unknown): string {
  const reasons: Record<string, string> = {
    '23505': 'DATABASE_UNIQUE_VIOLATION',
    '23503': 'DATABASE_REFERENCE_VIOLATION',
    '40001': 'DATABASE_SERIALIZATION_FAILURE',
    '40P01': 'DATABASE_DEADLOCK',
    '57014': 'DATABASE_TIMEOUT',
    ECONNREFUSED: 'CONNECTION_UNAVAILABLE',
    P0001: 'DATABASE_TRANSACTION_FAILURE',
  };
  if (error && typeof error === 'object' && 'code' in error && typeof error.code === 'string')
    return reasons[error.code] ?? 'REQUEST_PROCESSING_FAILED';
  return 'REQUEST_PROCESSING_FAILED';
}
