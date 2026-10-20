import { expect, it, vi } from 'vitest';
import type { Pool } from 'pg';
import { inTransaction } from './transaction.js';

it('discards a connection when rollback fails and preserves the application error', async () => {
  const query = vi.fn().mockResolvedValueOnce({}).mockRejectedValueOnce(new Error('rollback'));
  const release = vi.fn();
  const pool = { connect: vi.fn().mockResolvedValue({ query, release }) } as unknown as Pick<
    Pool,
    'connect'
  >;
  const failure = new Error('application');
  await expect(
    inTransaction(pool, async () => {
      throw failure;
    }),
  ).rejects.toBe(failure);
  expect(query.mock.calls.map(([sql]) => sql)).toEqual(['BEGIN', 'ROLLBACK']);
  expect(release).toHaveBeenCalledExactlyOnceWith(true);
  expect(pool.connect).toHaveBeenCalledTimes(1);
});
