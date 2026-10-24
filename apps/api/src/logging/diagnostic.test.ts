import { expect, it } from 'vitest';
import { diagnosticMetadata } from './diagnostic.js';
import { parseEnvironment } from '../config/environment.js';
it('records only fixed diagnostic metadata and excludes URL, credentials and request payloads', () => {
  const event = diagnosticMetadata(
    { path: '/api/v1/businesses/private-user/inventory?token=secret' },
    500,
    'INTERNAL_ERROR',
    '00000000-0000-4000-8000-000000000001',
    parseEnvironment({
      DATABASE_URL: 'postgresql://user:private@localhost/test',
      APP_VERSION: 'test-25a',
    }),
  );
  expect(JSON.stringify(event)).not.toMatch(/private|token|secret|postgres/);
  expect(event).toMatchObject({
    environment: 'development',
    applicationVersion: 'test-25a',
    severity: 'error',
    category: 'application',
  });
});
