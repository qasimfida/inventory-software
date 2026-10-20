import { expect, it } from 'vitest';
import { hasPermission, permissionSchema, rolePermissions } from './permissions.js';
import { assignMemberSchema } from './organization.js';
it('denies unknown roles and grants no administrative permission to cashiers', () => {
  expect(rolePermissions('invalid' as never)).toEqual([]);
  expect(hasPermission({ role: 'cashier' }, 'users.write')).toBe(false);
  expect(hasPermission({ role: 'cashier' }, 'stock.write')).toBe(false);
  expect(hasPermission({ role: 'cashier' }, 'sales.write')).toBe(true);
  expect(hasPermission({ role: 'custom', permissions: ['products.read'] }, 'products.write')).toBe(
    false,
  );
  for (const permission of permissionSchema.options)
    expect(hasPermission({ role: 'owner' }, permission)).toBe(true);
});
it('rejects privilege and scope smuggling at the contract boundary', () => {
  for (const extra of [
    { role: 'super_admin' },
    { role: 'custom', permissions: ['users.write'] },
    { role: 'owner', scope: { storeId: '00000000-0000-4000-8000-000000000001' } },
    { role: 'cashier', permissions: ['business.write'] },
  ])
    expect(assignMemberSchema.safeParse({ email: 'test@example.test', ...extra }).success).toBe(
      false,
    );
});
