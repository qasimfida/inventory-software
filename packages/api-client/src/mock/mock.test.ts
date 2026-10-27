import { expect, it } from 'vitest';
import * as c from '@inventory/contracts';
import { demoController, demoTransport } from './index.js';
import { createAuthClient, memoryCredentialStore } from '../auth.js';
import { demoId } from './identity.js';
const schemas = [
  ['setup', c.setupChecklistSchema],
  ['products', c.productPageSchema],
  ['operations', c.operationsPageSchema],
  [`operations/costs/${demoId(7100)}`, c.costDetailSchema],
  ['categories', c.categoriesSchema],
  [`products/${demoId(101)}/pricing`, c.pricingWorkspaceSchema],
  ['stock', c.stockWorkspaceSchema],
  ['storage', c.storageWorkspaceSchema],
  ['pos/items', c.posItemsSchema],
  ['counts', c.countHeaderSchema.array().transform((counts) => ({ counts }))],
  ['purchasing', c.purchaseWorkspaceSchema],
  [`purchases/${demoId(500)}`, c.purchaseDetailSchema],
  ['transfers', c.transferWorkspaceSchema],
  ['customers', c.customerPageSchema],
  [`customers/${demoId(800)}/statement`, c.customerStatementSchema],
  ['sales', c.salePageSchema],
  [`sales/${demoId(1000)}/receipt`, c.saleReceiptSchema],
  ['cash-shifts', c.shiftPageSchema],
  ['payables', c.payablePageSchema],
  ['notifications', c.businessInboxSchema],
  ['notifications/approvals', c.approvalQueueSchema],
  ['notifications/failures', c.businessFailuresSchema],
  ['accounting', c.accountingPageSchema],
  ['trading', c.tradingPageSchema],
  ['integrations', c.integrationStatusSchema],
  ['warehouse-view', c.warehouseViewSchema],
  ['audit', c.auditListSchema],
  ['sync/policy', c.offlinePolicySchema],
] as const;
for (const scenario of ['normal', 'empty'] as const)
  it(`loads every demo module through runtime contracts (${scenario})`, async () => {
    demoController.configure('owner', scenario);
    const client = createAuthClient(
      'http://localhost:3100',
      demoTransport,
      memoryCredentialStore(),
    );
    for (const [path, schema] of schemas) {
      const result = await client.organizationRequest(`/${demoId(1)}/${path}`);
      const parsed =
        path === 'counts'
          ? c.countHeaderSchema.array().safeParse((result as { counts: unknown }).counts)
          : schema.safeParse(result);
      expect(parsed.success, `${path}: ${parsed.success ? '' : parsed.error.message}`).toBe(true);
    }
  });
it('enforces role and business isolation without falling through to a network transport', async () => {
  demoController.configure('cashier', 'normal');
  const client = createAuthClient('http://localhost:3100', demoTransport, memoryCredentialStore());
  await expect(client.organizationRequest(`/${demoId(1)}/accounting`)).rejects.toMatchObject({
    status: 403,
  });
  await expect(client.organizationRequest(`/${demoId(999999)}/products`)).rejects.toMatchObject({
    status: 404,
  });
  demoController.configure('owner', 'error');
  await expect(client.organizationRequest(`/${demoId(1)}/products`)).rejects.toMatchObject({
    status: 503,
    details: expect.objectContaining({ code: 'UNAVAILABLE', retryable: true }),
  });
  demoController.configure('owner', 'offline');
  await expect(client.organizationRequest(`/${demoId(1)}/products`)).rejects.toThrow(
    'offline scenario',
  );
});
it('offers every seeded role with scoped navigation and platform-only analytics', async () => {
  const { demoRoles } = await import('./identity.js');
  const { availableRoutes } = await import('../workspace-navigation.js');
  for (const role of demoRoles) {
    demoController.configure(role, 'normal');
    const client = createAuthClient(
      'http://localhost:3100',
      demoTransport,
      memoryCredentialStore(),
    );
    const settings = c.settingsSnapshotSchema.parse(await client.accountRequest('settings'));
    expect(settings.canManagePlatform).toBe(role === 'superadmin');
    const list = c.businessListSchema.parse(await client.organizationRequest(''));
    const business = list.businesses[0]!;
    const paths = availableRoutes(business).map((r) => r.path);
    expect(paths.includes('/pos')).toBe(
      ['superadmin', 'owner', 'manager', 'cashier'].includes(role),
    );
    if (role === 'superadmin') {
      const overview = c.platformOverviewSchema.parse(
        await client.accountRequest('security/platform/overview'),
      );
      expect(overview.totals.businesses).toBe('2');
      const directory = c.platformBusinessesSchema.parse(
        await client.accountRequest('security/platform/businesses'),
      );
      expect(directory.businesses[0]).toMatchObject({ storeCount: '1', warehouseCount: '2' });
    } else
      await expect(client.accountRequest('security/platform/businesses')).rejects.toMatchObject({
        status: 403,
      });
  }
});

it('pages staff fixtures, filters costs and denies cashier access', async () => {
  demoController.configure('owner', 'normal');
  const client = createAuthClient('http://localhost:3100', demoTransport, memoryCredentialStore());
  const first = c.operationsPageSchema.parse(
    await client.organizationRequest(`/${demoId(1)}/operations`),
  );
  expect(first.staff).toHaveLength(25);
  expect(first.staffHasMore).toBe(true);
  const next = c.operationsPageSchema.parse(
    await client.organizationRequest(`/${demoId(1)}/operations?offset=25`),
  );
  expect(next.staff).toHaveLength(1);
  expect(next.staffHasMore).toBe(false);
  const filtered = c.operationsPageSchema.parse(
    await client.organizationRequest(`/${demoId(1)}/operations?search=DEMO-COST-26`),
  );
  expect(filtered.costs).toHaveLength(1);
  demoController.configure('cashier', 'normal');
  await expect(client.organizationRequest(`/${demoId(1)}/operations`)).rejects.toMatchObject({
    status: 403,
  });
});
