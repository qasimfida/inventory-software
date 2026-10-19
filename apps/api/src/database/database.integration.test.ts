import { expect, it } from 'vitest';
import { DatabaseService } from './database.service.js';
import { parseEnvironment } from '../config/environment.js';

it('queries PostgreSQL and closes its pool', async () => {
  const databaseUrl = process.env.TEST_DATABASE_URL;
  if (!databaseUrl) throw new Error('Set TEST_DATABASE_URL to a disposable PostgreSQL database.');
  const database = new DatabaseService(
    parseEnvironment({ NODE_ENV: 'test', DATABASE_URL: databaseUrl }),
  );
  try {
    expect(await database.isReady()).toBe(true);
  } finally {
    await database.onApplicationShutdown();
  }
});
