import { expect, it } from 'vitest';
import { permissionGroups, permissionLabel, roleCapabilities } from './access-presentation.js';
import { rolePermissions } from '@inventory/contracts';
it('groups only currently assignable permissions and preserves scope exclusions', () => {
  const business = permissionGroups(false).flatMap((group) => group.permissions);
  const scoped = permissionGroups(true).flatMap((group) => group.permissions);
  expect(new Set(business).size).toBe(business.length);
  expect(business).not.toContain('users.write');
  expect(business).toContain('business.write');
  expect(scoped).not.toContain('business.write');
  expect(scoped).not.toContain('users.read');
  expect(scoped).toContain('sales.refund');
});
it('describes roles using the canonical permissions without inventing grants', () => {
  for (const role of ['owner', 'manager', 'cashier', 'viewer'] as const)
    expect(roleCapabilities(role)).toEqual(rolePermissions(role).map(permissionLabel));
  expect(roleCapabilities('viewer')).toHaveLength(2);
  expect(permissionLabel('sales.refund')).toBe('Issue refunds · Sales and receipts');
});
