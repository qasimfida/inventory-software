import {
  platformBusinessesQuerySchema,
  platformBusinessesSchema,
  platformBusinessDetailSchema,
} from '@inventory/contracts';
import type { PlatformBusinessesQuery, PlatformBusiness, Location } from '@inventory/contracts';
import type { OrganizationTransport } from './organization.js';
import type { CancellationSignal } from './cancellation.js';
export function createPlatformBusinessesClient(account: OrganizationTransport) {
  return {
    list: async (input: PlatformBusinessesQuery, signal?: CancellationSignal) => {
      const q = platformBusinessesQuerySchema.parse(input);
      return platformBusinessesSchema.parse(
        await account(
          `security/platform/businesses?search=${encodeURIComponent(q.search)}&state=${q.state}&offset=${q.offset}`,
          'GET',
          undefined,
          signal,
        ),
      );
    },
    detail: async (id: string, offset = 0, signal?: CancellationSignal) =>
      platformBusinessDetailSchema.parse(
        await account(
          `security/platform/businesses/${encodeURIComponent(id)}?offset=${offset}`,
          'GET',
          undefined,
          signal,
        ),
      ),
  };
}

/** Presentation of already-authorized registration data; does not grant business access. */
export function platformBusinessDetails(business: PlatformBusiness, location?: Location) {
  const fields = [
    { label: 'Name', value: location?.name ?? business.name },
    { label: 'Status', value: location?.state ?? business.state },
    { label: 'Business', value: business.name },
    { label: 'Time zone', value: business.timeZone },
  ];
  if (location)
    fields.push(
      { label: 'Code', value: location.code },
      { label: 'Type', value: location.type },
      {
        label: 'Store reference',
        value:
          location.storeId ?? (location.kind === 'stores' ? 'This is a store' : 'Not recorded'),
      },
      { label: 'Location reference', value: location.id },
    );
  else
    fields.push(
      { label: 'Registered (UTC)', value: business.createdAt },
      { label: 'Stores', value: business.storeCount ?? 'Not reported' },
      { label: 'Warehouses', value: business.warehouseCount ?? 'Not reported' },
    );
  fields.push({ label: 'Business reference', value: business.id });
  return fields;
}
export function registrationTone(state: string): 'success' | 'warning' | 'neutral' {
  return state === 'active' ? 'success' : state === 'suspended' ? 'warning' : 'neutral';
}
