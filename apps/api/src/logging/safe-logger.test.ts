import { expect, it } from 'vitest';
import { SafeLogger } from './safe-logger.js';

it('redacts nested credentials, URLs, errors and circular objects in valid JSON', () => {
  const lines: string[] = [];
  const logger = new SafeLogger((line) => lines.push(line));
  const value: Record<string, unknown> = {
    event: 'test',
    OPEN_EXCHANGE_RATES_APP_ID: 'rate-provider-secret',
    app_id: 'another-provider-secret',
    password: 'secret-value',
    nested: { authorization: 'Bearer private' },
    detail: 'postgresql://user:private@localhost/db',
    error: new Error('private'),
    privateKey: 'key-material',
    diagnostic: '-----BEGIN PRIVATE KEY-----\nkey-material\n-----END PRIVATE KEY-----',
  };
  value.self = value;
  logger.log(value);
  logger.error('private driver failure', 'private stack');
  expect(lines.join('')).not.toMatch(/"private"|secret-value|private driver|private stack/);
  expect(lines.join('')).not.toContain('key-material');
  expect(lines.join('')).not.toContain('provider-secret');
  expect(JSON.parse(lines[0]!).message.event).toBe('test');
  expect(JSON.parse(lines[0]!).message.self).toBe('[CIRCULAR]');
  expect(JSON.parse(lines[1]!).level).toBe('error');
});
