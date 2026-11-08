import { expect, it } from 'vitest';
import type { Business } from '@inventory/contracts';
import {
  workspaceRoutes,
  canSwitchWorkspace,
  overviewDestination,
  availableRoutes,
} from './workspace-navigation';
const business = (role: Business['role'], permissions?: Business['permissions']): Business => ({
  id: '00000000-0000-4000-8000-000000000001',
  name: 'Example',
  state: 'active',
  role,
  version: 1,
  timeZone: 'UTC',
  permissions: permissions ?? [],
  scope: { storeId: null, warehouseId: null },
});
it('allows workspace switching only for platform or business administrators', () => {
  expect(canSwitchWorkspace(undefined, true)).toBe(true);
  expect(canSwitchWorkspace(business('owner'), false)).toBe(true);
  expect(canSwitchWorkspace(business('custom', ['business.write']), false)).toBe(true);
  for (const role of ['manager', 'cashier', 'viewer'] as const)
    expect(canSwitchWorkspace(business(role), false)).toBe(false);
  expect(canSwitchWorkspace({ ...business('owner'), state: 'suspended' }, false)).toBe(false);
});
it('routes platform admins to application analytics and cashiers to the existing POS', () => {
  expect(overviewDestination(undefined, true)).toBe('/admin');
  expect(overviewDestination(business('cashier'), false)).toBe('/pos');
  expect(overviewDestination({ ...business('cashier'), state: 'suspended' }, false)).toBe(
    '/dashboard',
  );
  expect(overviewDestination(business('manager'), false)).toBe('/dashboard');
  expect(overviewDestination(business('owner'), false)).toBe('/dashboard');
  expect(overviewDestination(business('viewer'), false)).toBe('/dashboard');
});

it('omits business-wide accounting for assigned store and warehouse managers', () => {
  const manager = business('manager');
  expect(availableRoutes(manager).some((r) => r.path === '/accounting')).toBe(true);
  const scoped = { ...manager, scope: { storeId: manager.id, warehouseId: null } };
  expect(availableRoutes(scoped).some((r) => r.path === '/accounting')).toBe(false);
  expect(availableRoutes(scoped).some((r) => r.path === '/reports')).toBe(true);
});

it('hides Overview for cashiers instead of rendering an inert link', () => {
  expect(availableRoutes(business('cashier')).some((route) => route.path === '/dashboard')).toBe(
    false,
  );
  expect(availableRoutes(business('cashier')).some((route) => route.path === '/pos')).toBe(true);
});

it('hides management settings without the corresponding write permission', () => {
  const paths = (b: Business) => availableRoutes(b).map((r) => r.path);
  for (const role of ['cashier', 'viewer'] as const) {
    expect(paths(business(role))).not.toContain('/settings/business');
    expect(paths(business(role))).not.toContain('/settings/company');
    expect(paths(business(role))).not.toContain('/settings/locations');
    expect(paths(business(role))).toContain('/settings/preferences');
    expect(paths(business(role))).toContain('/settings/security');
  }
  expect(paths(business('owner'))).toContain('/settings/business');
  expect(paths(business('manager'))).not.toContain('/settings/business');
  expect(paths(business('manager'))).toContain('/settings/locations');
  expect(paths(business('custom', ['business.write']))).toContain('/settings/business');
  expect(paths(business('custom', ['business.read']))).not.toContain('/settings/company');
  expect(availableRoutes().map((r) => r.path)).not.toContain('/settings/business');
});

it('places staff costs and account access outside settings and hides them from cashiers', () => {
  const owner = availableRoutes(business('owner'));
  expect(owner.find((r) => r.path === '/staff')?.group).toBe('Finance');
  expect(owner.find((r) => r.path === '/team')?.group).toBe('Team');
  expect(
    owner.filter((r) => r.group === 'Settings').some((r) => /staff|permissions/i.test(r.title)),
  ).toBe(false);
  expect(
    availableRoutes(business('cashier')).some((r) => ['/staff', '/team'].includes(r.path)),
  ).toBe(false);
});

it('shows category management only to business-wide catalog writers', () => {
  expect(availableRoutes(business('owner')).some((r) => r.path === '/categories')).toBe(true);
  expect(availableRoutes(business('cashier')).some((r) => r.path === '/categories')).toBe(false);
  const manager = business('manager');
  expect(
    availableRoutes({ ...manager, scope: { storeId: manager.id, warehouseId: null } }).some(
      (r) => r.path === '/categories',
    ),
  ).toBe(false);
});

it('combines inventory navigation without requiring both catalog and stock access', () => {
  const paths = (permissions: Business['permissions']) =>
    availableRoutes(business('custom', permissions)).map((r) => r.path);
  expect(paths(['products.read'])).toContain('/inventory');
  expect(paths(['stock.read'])).toContain('/inventory');
  expect(paths(['business.read'])).not.toContain('/inventory');
  expect(availableRoutes(business('owner')).map((r) => r.path)).not.toContain('/catalog');
});

it('merges storage navigation while preserving the hierarchy route and stock-count workspace', () => {
  const routes = availableRoutes(business('owner'));
  expect(
    routes.filter((route) => route.panel === 'storage' && !route.hidden).map((r) => r.path),
  ).toEqual(['/storage']);
  expect(workspaceRoutes.find((route) => route.path === '/warehouse-view')).toMatchObject({
    panel: 'storage',
    hidden: true,
  });
  expect(routes.find((route) => route.path === '/warehouse')).toMatchObject({ panel: 'warehouse' });
});

it('separates management and compensation from personal preferences without changing URLs', () => {
  const routes = availableRoutes(business('owner'));
  for (const path of [
    '/settings/business',
    '/settings/company',
    '/settings/locations',
    '/settings/security',
    '/settings/audit',
  ]) {
    expect(routes.find((r) => r.path === path)?.group).not.toBe('Settings');
  }
  expect(routes.filter((r) => r.path === '/salaries')).toHaveLength(1);
  for (const role of ['manager', 'cashier', 'viewer'] as const)
    expect(availableRoutes(business(role)).some((r) => r.path === '/salaries')).toBe(false);
  expect(
    availableRoutes({
      ...business('owner'),
      scope: { storeId: '00000000-0000-4000-8000-000000000002', warehouseId: null },
    }).some((r) => r.path === '/salaries'),
  ).toBe(false);
  expect(routes.some((r) => r.path === '/logs')).toBe(false);
  expect(workspaceRoutes.some((r) => r.path === '/logs')).toBe(true);
});
