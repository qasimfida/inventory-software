import { parseEnvironment } from '../config/environment.js';
import { assertDevelopmentDatabase } from './fixtures.js';
import { seedDevelopment } from './seed.js';

try {
  assertDevelopmentDatabase(process.env);
  const args = process.argv.slice(2);
  if (args.some((arg) => arg !== '--reset-accounts') || args.length > 1)
    throw new Error('Use db:seed:dev with optional --reset-accounts.');
  const result = await seedDevelopment(
    parseEnvironment(process.env),
    args.includes('--reset-accounts'),
  );
  process.stdout.write(
    `Development accounts ${result}. Credentials and role limitations are in README.md.\n`,
  );
} catch (error) {
  // Never print database errors, URLs, password hashes or credentials.
  const safe =
    error instanceof Error &&
    (error.message.startsWith('Development seeding requires') ||
      error.message.startsWith('Fixture collision') ||
      error.message.startsWith('Use db:seed:dev'));
  process.stderr.write(
    `${safe ? error.message : 'Development seed failed. Check local configuration and apply migrations; changes were rolled back.'}\n`,
  );
  process.exitCode = 1;
}
