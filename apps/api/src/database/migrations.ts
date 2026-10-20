import { fileURLToPath } from 'node:url';
import { join, sep } from 'node:path';
import { runner } from 'node-pg-migrate';
import type { Environment } from '../config/environment.js';
import { poolOptions } from './pool-options.js';

export async function runMigrations(
  environment: Environment,
  direction: 'up' | 'down',
  directory = fileURLToPath(new URL('../../migrations', import.meta.url)),
  schema = 'public',
) {
  if (direction === 'down' && environment.NODE_ENV === 'production')
    throw new Error('Production rollback requires a reviewed forward repair migration.');
  return runner({
    databaseUrl: poolOptions(environment),
    dir: join(directory, '*.sql').split(sep).join('/'),
    useGlob: true,
    direction,
    count: direction === 'down' ? 1 : Infinity,
    schema,
    migrationsSchema: schema,
    migrationsTable: 'schema_migrations',
    checkOrder: true,
    singleTransaction: true,
    log: () => undefined,
  });
}
