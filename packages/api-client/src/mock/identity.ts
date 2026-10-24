import { businessSchema, locationSchema, memberSchema } from '@inventory/contracts';
export const demoId = (n: number) => `d0000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
export const demoDate = (daysAgo = 0) => new Date(Date.now() - daysAgo * 86400000).toISOString();
export const demoRoles = [
  'superadmin',
  'owner',
  'manager',
  'cashier',
  'inventory',
  'accountant',
  'viewer',
] as const;
export type DemoRole = (typeof demoRoles)[number];
export type DemoScenario = 'normal' | 'empty' | 'error' | 'offline';
export function identitySeed(index: number, role: DemoRole) {
  const base = index * 10000,
    id = (n: number) => demoId(base + n);
  const business = businessSchema.parse({
    id: id(1),
    name: index === 0 ? 'Harbor & Pine Home' : 'Northstar Workshop',
    state: 'active',
    version: 1,
    timeZone: 'UTC',
    role:
      role === 'superadmin'
        ? 'super_admin'
        : ['inventory', 'accountant'].includes(role)
          ? 'custom'
          : role,
    permissions:
      role === 'inventory'
        ? [
            'locations.read',
            'products.read',
            'stock.read',
            'stock.write',
            'purchases.read',
            'purchases.write',
          ]
        : role === 'accountant'
          ? ['locations.read', 'sales.read', 'payments.read', 'customers.read', 'audit.read']
          : [],
    scope: ['superadmin', 'owner'].includes(role)
      ? { storeId: null, warehouseId: null }
      : { storeId: id(2), warehouseId: id(3) },
  });
  const locations = [
    {
      id: id(2),
      name: 'Central store',
      code: 'CENTRAL',
      kind: 'stores',
      type: 'store',
      storeId: null,
      warehouseId: null,
    },
    {
      id: id(3),
      name: 'Main warehouse',
      code: 'MAIN',
      kind: 'warehouses',
      type: 'warehouse',
      storeId: id(2),
      warehouseId: null,
    },
    {
      id: id(4),
      name: 'Reserve warehouse',
      code: 'RESERVE',
      kind: 'warehouses',
      type: 'warehouse',
      storeId: id(2),
      warehouseId: null,
    },
    {
      id: id(5),
      name: 'Front counter',
      code: 'POS-01',
      kind: 'terminals',
      type: 'pos',
      storeId: id(2),
      warehouseId: id(3),
    },
  ].map((l) => locationSchema.parse({ ...l, state: 'active', version: 1 }));
  const members = demoRoles
    .filter((r) => r !== 'superadmin')
    .map((r, i) =>
      memberSchema.parse({
        accountId: demoId(900 + i),
        email: `${r}@demo.example.test`,
        role: ['inventory', 'accountant'].includes(r) ? 'custom' : r,
        state: 'active',
        version: 1,
      }),
    );
  return { id, business, locations, members, currency: index === 0 ? 'USD' : 'GBP' };
}
