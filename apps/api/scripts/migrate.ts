import { fileURLToPath } from 'node:url';
import { sep } from 'node:path';
import { runner } from 'node-pg-migrate';
import { parseEnvironment } from '../src/config/environment.js';

const environment = parseEnvironment(process.env);
const direction = process.argv[2] ?? 'up';
if (direction !== 'up' && direction !== 'down') throw new Error('Use up or down.');
if (direction === 'down' && environment.NODE_ENV === 'production') {
  throw new Error('Production rollback requires a reviewed forward repair migration.');
}
try {
  await runner({
    databaseUrl: {
      connectionString: environment.DATABASE_URL,
      ssl: environment.DATABASE_SSL === 'verify-full' ? { rejectUnauthorized: true } : false,
    },
    dir: fileURLToPath(new URL('../migrations/*.sql', import.meta.url))
      .split(sep)
      .join('/'),
    useGlob: true,
    direction,
    count: direction === 'down' ? 1 : Infinity,
    migrationsTable: 'schema_migrations',
    checkOrder: true,
    singleTransaction: true,
    log: () => undefined,
  });
  console.log(`Migrations completed: ${direction}`);
} catch {
  console.error('Migration failed. Check database connectivity and migration files.');
  process.exitCode = 1;
}
