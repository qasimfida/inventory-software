import { randomUUID } from 'node:crypto';
import type { Transaction } from '../database/transaction.js';
import { developmentAccounts, developmentIds as ids, fixtureId } from './fixtures.js';

export async function seedOrganization(tx: Transaction) {
  await tx.query('INSERT INTO businesses(id,name) VALUES($1,$2),($3,$4)', [
    ids.business,
    'Local Development Business',
    ids.isolatedBusiness,
    'Local Isolation Business',
  ]);
  await tx.query(
    "INSERT INTO stores(id,business_id,name,code,type) VALUES($1,$2,'Development Store','DEV_STORE','store')",
    [ids.store, ids.business],
  );
  await tx.query(
    "INSERT INTO warehouses(id,business_id,store_id,name,code) VALUES($1,$2,$3,'Development Warehouse','DEV_WAREHOUSE')",
    [ids.warehouse, ids.business, ids.store],
  );
  await tx.query(
    "INSERT INTO terminals(id,business_id,store_id,warehouse_id,name,code,type) VALUES($1,$2,$3,$4,'Development Register','DEV_POS','pos')",
    [ids.terminal, ids.business, ids.store, ids.warehouse],
  );
  await tx.query('INSERT INTO platform_administrators(account_id) VALUES($1)', [fixtureId(1)]);
  for (const account of developmentAccounts.filter((a) => a.role !== 'super_admin')) {
    await tx.query(
      `INSERT INTO business_memberships(business_id,account_id,role,permissions,scope_store_id,scope_warehouse_id)
       VALUES($1,$2,$3,$4,$5,$6)`,
      [
        ids.business,
        account.id,
        account.role,
        account.permissions,
        account.scoped ? ids.store : null,
        account.scoped ? ids.warehouse : null,
      ],
    );
  }
  for (const businessId of [ids.business, ids.isolatedBusiness]) {
    await tx.query(
      `INSERT INTO organization_audit(business_id,actor_id,resource_id,action,request_id,after_data)
       VALUES($1,$2,$1,'development.fixtures.created',$3,'{}')`,
      [businessId, fixtureId(1), randomUUID()],
    );
  }
}
