import { randomUUID } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';
import { Pool } from 'pg';
import request from 'supertest';
import { afterAll, beforeAll, expect, vi } from 'vitest';
import type { INestApplication } from '@nestjs/common';
import { authResponseSchema } from '@inventory/contracts';
import { createApplication } from '../src/bootstrap.js';
import { parseEnvironment } from '../src/config/environment.js';
import { runMigrations } from '../src/database/migrations.js';
import { newToken, tokenHash } from '../src/auth/secrets.js';

export const password = 'correct horse battery staple';
export const native = (token = '') => ({
  'x-inventory-client': 'native',
  authorization: `Bearer ${token}`,
});
export function authFixture(prefix: 'auth_test_' | 'inventory_dev_' = 'auth_test_') {
  let app: INestApplication;
  let admin: Pool;
  let database: Pool;
  const name = `${prefix}${randomUUID().replaceAll('-', '')}`;
  beforeAll(async () => {
    if (!process.env.TEST_DATABASE_URL)
      throw new Error('TEST_DATABASE_URL requires a disposable PostgreSQL role with CREATEDB.');
    admin = new Pool({ connectionString: process.env.TEST_DATABASE_URL });
    await admin.query(`CREATE DATABASE "${name}"`);
    const url = new URL(process.env.TEST_DATABASE_URL);
    url.pathname = `/${name}`;
    vi.stubEnv('DATABASE_URL', url.toString());
    vi.stubEnv('DATABASE_SSL', 'disable');
    vi.stubEnv('NODE_ENV', 'test');
    vi.stubEnv('CORS_ORIGINS', 'http://localhost:5173');
    const env = parseEnvironment(process.env);
    await runMigrations(env, 'up');
    await runMigrations(env, 'up');
    database = new Pool({ connectionString: url.toString() });
    app = await createApplication(false);
    await app.init();
  }, 20000);
  afterAll(async () => {
    // Optional diagnostic mode: retain only this uniquely named test database.
    // Tests and up migrations still run; rollback/drop validation is explicitly skipped.
    if (process.env.TEST_RETAIN_DATABASES === 'true') {
      try {
        await app?.close();
      } finally {
        await database?.end();
        await admin?.end();
        vi.unstubAllEnvs();
        console.info(`Retained isolated test database: ${name}`);
      }
      return;
    }
    try {
      await app?.close();
      if (database) {
        while ((await database.query('SELECT id FROM schema_migrations LIMIT 1')).rowCount)
          await runMigrations(parseEnvironment(process.env), 'down');
        expect(
          (await database.query("SELECT to_regclass('auth_accounts') AS name")).rows[0].name,
        ).toBeNull();
      }
    } finally {
      await database?.end();
      if (admin) {
        // node-pg-migrate closes its client without awaiting the socket's final disconnect.
        // Let those completed migration connections drain before dropping the test database.
        try {
          const deadline = Date.now() + 5000;
          let connections: number;
          do {
            connections = Number(
              (
                await admin.query(
                  'SELECT count(*) AS connections FROM pg_stat_activity WHERE datname=$1',
                  [name],
                )
              ).rows[0].connections,
            );
            if (connections === 0) break;
            await delay(20);
          } while (Date.now() < deadline);
          expect(connections, 'Test database connections must drain before drop').toBe(0);
          await admin.query(`DROP DATABASE IF EXISTS "${name}"`);
        } finally {
          await admin.end();
        }
      }
      vi.unstubAllEnvs();
    }
  });
  const api = () => request(app.getHttpServer());
  async function invite(email: string) {
    const token = newToken();
    await database.query(
      `INSERT INTO auth_invitations(token_hash,email,expires_at) VALUES($1,$2,now()+interval '1 hour')`,
      [tokenHash(token), email],
    );
    return token;
  }
  async function register(email: string) {
    const invitationToken = await invite(email);
    const response = await api()
      .post('/api/v1/auth/invitations/accept')
      .set(native())
      .send({ email, password, invitationToken })
      .expect(201);
    return authResponseSchema.parse(response.body);
  }
  return { api, invite, register, db: () => database, application: () => app };
}
