import { parseEnvironment } from '../config/environment.js';
import { SafeLogger } from '../logging/safe-logger.js';
import { runMigrations } from './migrations.js';

const logger = new SafeLogger();
try {
  const cliArguments = process.argv.slice(2);
  if (cliArguments.includes('--production')) process.env.NODE_ENV = 'production';
  const directions = cliArguments.filter((value) => value !== '--production');
  const direction = directions[0] ?? 'up';
  if (directions.length > 1 || (direction !== 'up' && direction !== 'down'))
    throw new Error('Use up or down.');
  const migrations = await runMigrations(parseEnvironment(process.env), direction);
  logger.log({ event: 'migrations.completed', direction, count: migrations.length });
} catch {
  logger.error({
    event: 'migrations.failed',
    hint: 'Check configuration, connectivity and migration files.',
  });
  process.exitCode = 1;
}
