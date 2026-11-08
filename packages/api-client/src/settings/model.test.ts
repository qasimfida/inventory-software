import { preferenceRecordSchema } from '@inventory/contracts';
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
  expect(model.effective().appearance).toBe('light');
  await model.connect('user-b', 'business-b');
  expect(model.effective().appearance).toBe('light');
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
  expect(model.effective().appearance).toBe('light');
  expect(model.snapshot().message).toContain('not confirmed');
  expect(account).toHaveBeenCalledTimes(2);
});

it('retains confirmed appearance during same-account read failures but clears it for a new account', async () => {
  const account = vi
    .fn()
    .mockResolvedValueOnce({
      ...snapshot,
      preferences: { version: 1, values: { appearance: 'dark' } },
    })
    .mockRejectedValue(new Error('offline'));
  const model = new SettingsModel(createSettingsClient(account, vi.fn()));
  await model.connect('a');
  await model.connect('a');
  expect(model.effective().appearance).toBe('dark');
  await model.connect('b');
  expect(model.effective().appearance).toBe('light');
});

it('keeps a confirmed save if the subsequent policy refresh fails without retrying the write', async () => {
  const account = vi
    .fn()
    .mockResolvedValueOnce(snapshot)
    .mockResolvedValueOnce({ version: 1, values: { appearance: 'dark' } })
    .mockRejectedValueOnce(new Error('offline'));
  const model = new SettingsModel(createSettingsClient(account, vi.fn()));
  await model.connect('a');
  await model.save({ appearance: 'dark' });
  expect(model.snapshot().snapshot?.preferences.version).toBe(1);
  expect(model.effective().appearance).toBe('dark');
  expect(account.mock.calls.filter((call) => call[1] === 'PUT')).toHaveLength(1);
});

it('keeps the confirmed account palette across businesses and a second device', async () => {
  let saved = { version: 0, values: {} };
  const request = vi.fn(async (path: string, method?: string, input?: unknown) => {
    expect(path).toBe('settings');
    if (method === 'PUT') {
      saved = { version: saved.version + 1, values: preferenceRecordSchema.parse(input).values };
      return saved;
    }
    return { ...snapshot, preferences: saved };
  });
  const business = vi.fn().mockResolvedValue({
    ...empty,
    values: { ...empty.values, defaults: { accent: 'amber' }, enforced: { accent: 'rose' } },
  });
  const model = new SettingsModel(createSettingsClient(request, business));
  await model.connect('a', 'business-a');
  await model.save({ accent: 'violet' });
  expect(model.effective().accent).toBe('violet');
  await model.connect('a', 'business-b');
  expect(model.effective().accent).toBe('violet');
  const secondDevice = new SettingsModel(createSettingsClient(request, business));
  await secondDevice.connect('a', 'business-b');
  expect(secondDevice.effective().accent).toBe('violet');
});

it('display preference never changes the business transaction default or clears it during same-business saves', async () => {
  let values = { currency: 'PKR' };
  const account = vi.fn(async (path: string, method?: string, body?: unknown) => {
    if (path === 'exchange-rates') return { snapshot: null, reason: 'not-configured' };
    if (method === 'PUT') {
      values = { currency: preferenceRecordSchema.parse(body).values.currency! };
      return { version: 2, values };
    }
    return { ...snapshot, preferences: { version: 1, values } };
  });
  const business = vi.fn().mockResolvedValue({
    ...empty,
    values: { ...empty.values, company: { transactionCurrency: 'EUR' } },
  });
  const model = new SettingsModel(createSettingsClient(account, business));
  await model.connect('a', 'b');
  const observed: string[] = [];
  model.subscribe(() => observed.push(model.transactionCurrency()));
  await model.save({ currency: 'JPY' });
  expect(model.effective().currency).toBe('JPY');
  expect(new Set(observed)).toEqual(new Set(['EUR']));
});

it('retains only in-memory rates on network failure and clears them on logout', async () => {
  const now = Date.now();
  const rates = {
    snapshot: {
      source: 'Open Exchange Rates',
      base: 'USD',
      asOf: new Date(now).toISOString(),
      fetchedAt: new Date(now).toISOString(),
      expiresAt: new Date(now + 86400000).toISOString(),
      rates: { USD: '1', PKR: '280' },
    },
    reason: null,
  };
  const account = vi.fn(async (path: string) => (path === 'exchange-rates' ? rates : snapshot));
  const model = new SettingsModel(createSettingsClient(account, vi.fn()));
  await model.connect('a');
  await model.refreshRates();
  expect(model.snapshot().rates.snapshot?.rates.PKR).toBe('280');
  account.mockRejectedValue(new Error('offline'));
  await model.refreshRates();
  expect(model.snapshot().ratesOnline).toBe(false);
  expect(model.snapshot().rates.snapshot?.rates.PKR).toBe('280');
  await model.connect(null);
  expect(model.snapshot().rates.snapshot).toBeNull();
});
