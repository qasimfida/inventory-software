import { it, expect } from 'vitest';
import { OnlineOverviewModel } from './online-overview.js';
import { onlineMessages } from './online-messages.js';
import { createOnlineStoreClient } from './storefront-management.js';
const summary = {
  status: 'configured',
  counts: { selected: 0, ready: 2, needs_changes: 1, active: 3, paused: 1 },
  soldOut: 1,
  warnings: 2,
  lastValidatedAt: null,
  asOf: '2026-10-25T12:00:00Z',
};
it('retains read-only snapshots after failure, clears denied data and retries a command with the same identity', async () => {
  let fail = 0,
    commandFails = true;
  const ids: string[] = [];
  const model = new OnlineOverviewModel(
    createOnlineStoreClient(
      async (path, method, body) => {
        if (fail) throw Object.assign(new Error('restricted diagnostic'), { status: fail });
        if (method === 'POST') {
          ids.push((body as { idempotencyKey: string }).idempotencyKey);
          if (commandFails) throw new Error('lost acknowledgement');
          return { ok: true, items: [] };
        }
        return path.endsWith('/overview')
          ? summary
          : { settings: null, defaults: {}, prerequisites: ['Configure'] };
      },
      'b',
      's',
    ),
    () => 'd0000000-0000-4000-8000-000000000001',
  );
  await model.refresh();
  await model.recheck();
  expect(model.snapshot().error).toBe(onlineMessages.serverError);
  expect(model.snapshot().overview?.asOf).toBe(summary.asOf);
  commandFails = false;
  await model.refresh();
  await model.recheck();
  expect(ids).toHaveLength(2);
  expect(ids[0]).toBe(ids[1]);
  expect(model.snapshot().message).toBe(onlineMessages.rechecked);
  fail = 403;
  await model.refresh();
  expect(model.snapshot().overview).toBeNull();
  expect(model.snapshot().settings).toBeNull();
  expect(model.snapshot().error).not.toContain('restricted diagnostic');
});
it('ignores an overview response after unmount or workspace reset', async () => {
  let resolve!: (v: unknown) => void;
  const model = new OnlineOverviewModel(
    createOnlineStoreClient(
      async (path) =>
        path.endsWith('/overview')
          ? new Promise((r) => {
              resolve = r;
            })
          : { settings: null, defaults: {}, prerequisites: [] },
      'b',
      's',
    ),
    () => 'unused',
  );
  const pending = model.refresh();
  model.reset();
  resolve(summary);
  await pending;
  expect(model.snapshot().overview).toBeNull();
});
