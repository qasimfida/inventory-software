import type { PoolConfig } from 'pg';
import type { Environment } from '../config/environment.js';

export function poolOptions(environment: Environment): PoolConfig {
  return {
    connectionString: environment.DATABASE_URL,
    ssl: environment.DATABASE_SSL === 'verify-full' ? { rejectUnauthorized: true } : false,
    max: environment.DATABASE_POOL_MAX,
    connectionTimeoutMillis: environment.DATABASE_CONNECT_TIMEOUT_MS,
    idleTimeoutMillis: 30000,
    statement_timeout: environment.DATABASE_STATEMENT_TIMEOUT_MS,
    idle_in_transaction_session_timeout: environment.DATABASE_IDLE_TRANSACTION_TIMEOUT_MS,
    application_name: 'inventory-api',
  };
}
