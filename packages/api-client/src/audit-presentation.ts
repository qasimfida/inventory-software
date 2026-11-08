import type { OrganizationView } from './organization-model.js';
import { securityTime } from './security-presentation.js';

/** Label only: the original event code and immutable payload remain available. */
export function auditActionLabel(action: string) {
  const words = action.replace(/[._-]+/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2');
  return words.charAt(0).toUpperCase() + words.slice(1);
}
export function auditDetails(event: OrganizationView['events'][number], timeZone: string) {
  return [
    { label: 'Event code', value: event.action },
    { label: 'Event reference', value: event.id },
    { label: 'Support reference', value: event.requestId },
    { label: 'Date and time', value: securityTime(event.occurredAt, true, timeZone) },
    { label: 'Performed by', value: event.actorEmail ?? 'Account name unavailable' },
    { label: 'Actor reference', value: event.actorId },
    { label: 'Record reference', value: event.resourceId },
    { label: 'Store reference', value: event.storeId ?? 'Business-wide' },
    { label: 'Warehouse reference', value: event.warehouseId ?? 'Not specified' },
  ];
}
/** Render authorized loaded evidence without interpreting amounts, omitting keys or fetching data. */
export function auditChangeDetails(before: unknown, after: unknown) {
  const result: { label: string; value: string }[] = [];
  function flatten(value: unknown, path: string) {
    if (value && typeof value === 'object') {
      const entries = Object.entries(value);
      if (!entries.length) result.push({ label: path, value: Array.isArray(value) ? '[]' : '{}' });
      for (const [key, child] of entries) flatten(child, `${path} · ${key}`);
    } else result.push({ label: path, value: value === null ? 'Not set' : String(value) });
  }
  flatten(before, 'Before');
  flatten(after, 'After');
  return result;
}
