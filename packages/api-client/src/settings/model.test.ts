import { expect, it, vi } from 'vitest';
import { SettingsModel } from './model.js';
import { createSettingsClient } from './client.js';
const empty = { version: 0, values: { defaults: {}, enforced: {}, notifications: {} } };
const snapshot = {
  preferences: { version: 0, values: {} },
  platform: empty,
  canManagePlatform: false,
  connectivity: { online: true, offlineCash: 'bounded-grant', localNetwork: 'deployment-required' },
};
it('rejects stale account responses and clears policies on logout/business switches', async () => {
  let release!: (value: unknown) => void;
  const account = vi
    .fn()
    .mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          release = resolve;
        }),
    )
    .mockResolvedValue(snapshot);
  const business = vi
    .fn()
    .mockResolvedValue({ ...empty, values: { ...empty.values, enforced: { appearance: 'dark' } } });
  const model = new SettingsModel(createSettingsClient(account, business));
  const first = model.connect('user-a', 'business-a');
  await model.connect('user-b');
  release({ ...snapshot, preferences: { version: 1, values: { appearance: 'light' } } });
  await first;
  expect(model.snapshot().accountId).toBe('user-b');
  expect(model.effective().appearance).toBe('system');
  await model.connect('user-b', 'business-b');
  expect(model.effective().appearance).toBe('dark');
  await model.connect(null);
  expect(model.snapshot().business).toBeNull();
  expect(model.snapshot().snapshot).toBeNull();
});
it('does not optimistically save unconfirmed settings or queue/retry mutations', async () => {
  const account = vi
    .fn()
    .mockResolvedValueOnce(snapshot)
    .mockRejectedValueOnce(new Error('offline'));
  const model = new SettingsModel(createSettingsClient(account, vi.fn()));
  await model.connect('user');
  await model.save({ appearance: 'dark' });
  expect(model.effective().appearance).toBe('system');
  expect(model.snapshot().message).toContain('not confirmed');
  expect(account).toHaveBeenCalledTimes(2);
});
