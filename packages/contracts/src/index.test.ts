import { expect, it } from 'vitest';
import { apiOriginSchema, API_PREFIX } from '@inventory/contracts';

it('loads the public compiled contracts entry point', () => {
  expect(API_PREFIX).toBe('/api/v1');
  expect(apiOriginSchema.parse('https://api.example.test/')).toBe('https://api.example.test');
});
