import { randomUUID } from 'node:crypto';
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
        await admin.query(`DROP DATABASE IF EXISTS "${name}" WITH (FORCE)`);
        await admin.end();
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
