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
  expect(business).toContain('onlineStore.view');
  expect(business).toContain('onlineStore.manage');
  expect(scoped).toContain('onlineStore.view');
  expect(scoped).not.toContain('onlineStore.manage');
});
it('describes roles using the canonical permissions without inventing grants', () => {
  for (const role of ['owner', 'manager', 'cashier', 'viewer'] as const)
    expect(roleCapabilities(role)).toEqual(rolePermissions(role).map(permissionLabel));
  expect(roleCapabilities('viewer')).toHaveLength(2);
  expect(permissionLabel('sales.refund')).toBe('Issue refunds · Sales and receipts');
});

it('never describes unresolved store or warehouse scope as business-wide', async () => {
  const { memberScopeLabel } = await import('./access-presentation.js');
  expect(memberScopeLabel({ scope: { storeId: 'store-1', warehouseId: 'warehouse-1' } }, [])).toBe(
    'Store reference: store-1 / Warehouse reference: warehouse-1',
  );
  expect(memberScopeLabel({ scope: { storeId: null, warehouseId: null } }, [])).toBe(
    'Business-wide',
  );
});
it('empty custom permissions are explicit rather than described as role defaults', async () => {
  const { memberDetails } = await import('./access-presentation.js');
  expect(
    memberDetails(
      {
        accountId: 'account-1',
        email: 'member@example.test',
        role: 'custom',
        state: 'active',
        version: 1,
        permissions: [],
        scope: { storeId: null, warehouseId: null },
      },
      [],
    ).find((field) => field.label === 'Permissions')?.value,
  ).toBe('No permissions assigned');
});
