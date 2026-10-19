import { describe, expect, it } from 'vitest';
import { parseEnvironment } from './environment.js';

const development = { DATABASE_URL: 'postgresql://test:secret@localhost:5432/test' };

describe('environment validation', () => {
  it('normalizes CORS origins and permits only explicit desktop schemes', () => {
    expect(
      parseEnvironment({
        ...development,
        CORS_ORIGINS: 'https://EXAMPLE.test:443/,tauri://localhost',
      }).corsOrigins,
    ).toEqual(['https://example.test', 'tauri://localhost']);
    expect(() => parseEnvironment({ ...development, CORS_ORIGINS: 'tauri://other-host' })).toThrow(
      'CORS_ORIGINS',
    );
  });
  it('accepts explicit development configuration', () => {
    expect(parseEnvironment(development).PORT).toBe(3100);
  });
  it('does not disclose credentials in validation errors', () => {
    expect(() => parseEnvironment({ DATABASE_URL: 'private-credential' })).toThrow('DATABASE_URL');
    expect(() => parseEnvironment({ DATABASE_URL: 'private-credential' })).not.toThrow(
      'private-credential',
    );
  });
  it('rejects wildcard CORS, invalid ports and TLS URL overrides', () => {
    for (const overrides of [
      { CORS_ORIGINS: '*' },
      { PORT: '0' },
      { DATABASE_URL: `${development.DATABASE_URL}?sslmode=no-verify` },
    ]) {
      expect(() => parseEnvironment({ ...development, ...overrides })).toThrow();
    }
  });
  it('requires verified database TLS and HTTPS origins in production', () => {
    expect(() => parseEnvironment({ ...development, NODE_ENV: 'production' })).toThrow();
    expect(
      parseEnvironment({
        ...development,
        NODE_ENV: 'production',
        DATABASE_SSL: 'verify-full',
        CORS_ORIGINS: 'https://app.example.test',
      }).NODE_ENV,
    ).toBe('production');
  });
});
