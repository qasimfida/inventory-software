import { expect, it, vi } from 'vitest';
import {
  createPlatformBusinessesClient,
  platformBusinessDetails,
  registrationTone,
} from './platform-businesses.js';
const business = {
  id: '11111111-1111-4111-8111-111111111111',
  name: 'Example',
  state: 'active' as const,
  timeZone: 'UTC',
  createdAt: '2026-10-22T00:00:00.000Z',
};
it('keeps platform reads scoped, encoded, paginated and cancellable', async () => {
  const request = vi
    .fn()
    .mockResolvedValue({ businesses: [business], total: '1', offset: 25, hasMore: false });
  const signal = new AbortController().signal;
  await createPlatformBusinessesClient(request).list(
    { search: 'A & B', state: 'active', offset: 25 },
    signal,
  );
  expect(request).toHaveBeenCalledExactlyOnceWith(
    'security/platform/businesses?search=A%20%26%20B&state=active&offset=25',
    'GET',
    undefined,
    signal,
  );
});
it('does not turn unknown counts into zero or archived status into a warning', () => {
  expect(platformBusinessDetails(business)).toContainEqual({
    label: 'Stores',
    value: 'Not reported',
  });
  expect(platformBusinessDetails({ ...business, storeCount: '0' })).toContainEqual({
    label: 'Stores',
    value: '0',
  });
  expect(registrationTone('archived')).toBe('neutral');
  expect(registrationTone('suspended')).toBe('warning');
});
