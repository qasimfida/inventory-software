import { expect, it } from 'vitest';
import { assertDevelopmentDatabase } from './fixtures.js';

it('allows only explicit development mode and recognizable local databases', () => {
  const url = 'postgresql://inventory@127.0.0.1:5433/inventory';
  for (const mode of ['production', 'test', undefined])
    expect(() => assertDevelopmentDatabase({ NODE_ENV: mode, DATABASE_URL: url })).toThrow();
  for (const database of [
    'postgresql://remote.example:5433/inventory',
    'postgresql://localhost:5432/inventory',
    'postgresql://localhost:5433/production',
    'postgresql://localhost:5433/inventory_dev_check?host=remote.example',
  ])
    expect(() =>
      assertDevelopmentDatabase({ NODE_ENV: 'development', DATABASE_URL: database }),
    ).toThrow();
  for (const database of [url, 'postgresql://localhost:6543/inventory_dev_check'])
    expect(() =>
      assertDevelopmentDatabase({ NODE_ENV: 'development', DATABASE_URL: database }),
    ).not.toThrow();
});
