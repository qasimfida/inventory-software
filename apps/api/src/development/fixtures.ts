import type { AccessRole, Permission } from '@inventory/contracts';

// Public local fixtures. This directory is excluded from the deployable API artifact.
export const developmentPassword = 'LocalDev!2026-Only';
export const fixtureId = (number: number) =>
  `de000000-0000-4000-8000-${number.toString().padStart(12, '0')}`;
export const developmentIds = {
  business: fixtureId(100),
  isolatedBusiness: fixtureId(101),
  store: fixtureId(200),
  warehouse: fixtureId(300),
  terminal: fixtureId(400),
};
interface AccountFixture {
  id: string;
  email: string;
  role: AccessRole;
  permissions: Permission[];
  scoped: boolean;
}
export const developmentAccounts: AccountFixture[] = [
  {
    id: fixtureId(1),
    email: 'superadmin@example.test',
    role: 'super_admin',
    permissions: [],
    scoped: false,
  },
  { id: fixtureId(2), email: 'admin@example.test', role: 'owner', permissions: [], scoped: false },
  {
    id: fixtureId(3),
    email: 'manager@example.test',
    role: 'manager',
    permissions: [],
    scoped: true,
  },
  {
    id: fixtureId(4),
    email: 'cashier@example.test',
    role: 'cashier',
    permissions: [],
    scoped: true,
  },
  {
    id: fixtureId(5),
    email: 'inventory@example.test',
    role: 'custom',
    scoped: true,
    permissions: [
      'locations.read',
      'products.read',
      'stock.read',
      'stock.write',
      'purchases.read',
      'purchases.write',
    ],
  },
  {
    id: fixtureId(6),
    email: 'accountant@example.test',
    role: 'custom',
    scoped: true,
    permissions: ['locations.read', 'sales.read', 'payments.read', 'customers.read', 'audit.read'],
  },
  { id: fixtureId(7), email: 'viewer@example.test', role: 'viewer', permissions: [], scoped: true },
];

export function assertDevelopmentDatabase(input: Record<string, unknown>) {
  if (input.NODE_ENV !== 'development')
    throw new Error(
      'Development seeding requires NODE_ENV=development; production and test are refused.',
    );
  const url = new URL(String(input.DATABASE_URL));
  const local = ['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname);
  const database = url.pathname.slice(1);
  const approved =
    (database === 'inventory' && url.port === '5433') ||
    /^inventory_dev_[a-z0-9_]+$/.test(database);
  if (
    !local ||
    !approved ||
    url.search ||
    url.hash ||
    !['postgres:', 'postgresql:'].includes(url.protocol)
  )
    throw new Error(
      'Development seeding requires loopback inventory:5433 or an inventory_dev_* database.',
    );
}
