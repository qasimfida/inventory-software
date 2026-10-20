import { randomUUID } from 'node:crypto';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, it } from 'vitest';
import { DatabaseService } from './database.service.js';
import { parseEnvironment } from '../config/environment.js';
import { runMigrations } from './migrations.js';
import type { Transaction } from './transaction.js';

function environment() {
  if (!process.env.TEST_DATABASE_URL)
    throw new Error('Set TEST_DATABASE_URL to a disposable PostgreSQL database.');
  return parseEnvironment({
    NODE_ENV: 'test',
    DATABASE_URL: process.env.TEST_DATABASE_URL,
    DATABASE_STATEMENT_TIMEOUT_MS: 200,
  });
}

it('commits, rolls back, binds parameters, expires transactions and drains the pool', async () => {
  const database = new DatabaseService(environment());
  const schema = `test_${randomUUID().replaceAll('-', '')}`;
  let escaped: Transaction | undefined;
  try {
    expect(await database.isReady()).toBe(true);
    await database.query(`CREATE SCHEMA "${schema}"`);
    await database.query(`CREATE TABLE "${schema}".probe (value text)`);
    await database.transaction(async (tx) => {
      escaped = tx;
      await tx.query(`INSERT INTO "${schema}".probe VALUES ($1)`, [
        "literal'); DROP TABLE probe; --",
      ]);
    });
    await expect(escaped!.query('SELECT 1')).rejects.toThrow();
    await expect(
      database.transaction(async (tx) => {
        await tx.query(`INSERT INTO "${schema}".probe VALUES ('rollback')`);
        throw new Error('rollback');
      }),
    ).rejects.toThrow('rollback');
    expect((await database.query(`SELECT * FROM "${schema}".probe`)).rows).toHaveLength(1);
    await expect(database.query('SELECT pg_sleep(1)')).rejects.toThrow();
    expect(await database.isReady()).toBe(true);
  } finally {
    await database.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
    database.beforeApplicationShutdown();
    expect(await database.isReady()).toBe(false);
    await database.onApplicationShutdown();
    await database.onApplicationShutdown();
  }
});

it('executes migrations once, rolls them back and atomically rejects a failing migration', async () => {
  const env = environment();
  const database = new DatabaseService(env);
  const schema = `test_${randomUUID().replaceAll('-', '')}`;
  const directory = await mkdtemp(join(tmpdir(), 'inventory-migrations-'));
  try {
    await database.query(`CREATE SCHEMA "${schema}"`);
    await writeFile(
      join(directory, '1000000000000_probe.sql'),
      `-- Up Migration\nCREATE TABLE "${schema}".probe (id integer);\n-- Down Migration\nDROP TABLE "${schema}".probe;\n`,
    );
    expect(await runMigrations(env, 'up', directory, schema)).toHaveLength(1);
    expect(await runMigrations(env, 'up', directory, schema)).toHaveLength(0);
    expect(await runMigrations(env, 'down', directory, schema)).toHaveLength(1);
    await writeFile(
      join(directory, '1000000000001_failure.sql'),
      `-- Up Migration\nSELECT missing_foundation_function();\n-- Down Migration\nSELECT 1;\n`,
    );
    await expect(runMigrations(env, 'up', directory, schema)).rejects.toThrow();
    expect(
      (await database.query('SELECT to_regclass($1) AS name', [`${schema}.probe`])).rows[0]?.name,
    ).toBeNull();
    await expect(
      runMigrations({ ...env, NODE_ENV: 'production' }, 'down', directory, schema),
    ).rejects.toThrow('Production rollback');
  } finally {
    await database.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
    await database.onApplicationShutdown();
    await rm(directory, { recursive: true, force: true });
  }
});
