import { afterEach, it, vi } from 'vitest';
import request from 'supertest';
import { createApplication } from './bootstrap.js';

afterEach(() => vi.unstubAllEnvs());

it('loads the real API module and serves liveness without a database connection', async () => {
  vi.stubEnv('NODE_ENV', 'test');
  vi.stubEnv('DATABASE_URL', 'postgresql://test@127.0.0.1:1/test');
  vi.stubEnv('DATABASE_SSL', 'disable');
  vi.stubEnv('CORS_ORIGINS', 'http://localhost:8081');
  const app = await createApplication(false);
  try {
    await app.init();
    await request(app.getHttpServer()).get('/api/v1/health/live').expect(200, { status: 'ok' });
  } finally {
    await app.close();
  }
});
