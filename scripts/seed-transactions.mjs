/** Additive local-only transaction examples. Checkpoints preserve exact mutation payloads on rerun. */
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { Pool } from 'pg';
import {
  assertDevelopmentDatabase,
  developmentPassword,
  developmentIds,
} from '../apps/api/dist/development/fixtures.js';
process.loadEnvFile('apps/api/.env');
assertDevelopmentDatabase(process.env);
const origin = new URL(process.argv[2] ?? 'http://127.0.0.1:3100');
if (
  !['127.0.0.1', 'localhost', '[::1]'].includes(origin.hostname) ||
  origin.protocol !== 'http:' ||
  origin.pathname !== '/' ||
  origin.username ||
  origin.password ||
  origin.search ||
  origin.hash
)
  throw new Error('Use a loopback development API.');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = (await pool.query('SELECT oid::text FROM pg_database WHERE datname=current_database()'))
  .rows[0].oid;
await pool.end();
const hash = (value) => createHash('sha256').update(value).digest('hex');
const uuid = (value) => {
  const h = hash(value);
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`;
};
mkdirSync('.local/transaction-fixtures', { recursive: true, mode: 0o700 });
const file = `.local/transaction-fixtures/${hash(origin.origin + db).slice(0, 16)}.json`;
const saved = existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : {};
let token;
const persist = () => writeFileSync(file, JSON.stringify(saved, null, 2), { mode: 0o600 });
async function request(path, body, method = body ? 'POST' : 'GET') {
  const response = await fetch(`${origin.origin}/api/v1${path}`, {
    method,
    headers: {
      'content-type': 'application/json',
      'x-inventory-client': 'native',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
    signal: AbortSignal.timeout(20000),
  });
  if (!response.ok)
    throw new Error(
      `Fixture request ${path} failed (${response.status}); checkpoint retained, no automatic retry.`,
    );
  return response.json();
}
async function once(label, path, body, idempotent = true) {
  if (saved[label]?.result) return saved[label].result;
  if (!saved[label]) {
    saved[label] = {
      path,
      body: {
        ...body,
        ...(idempotent ? { idempotencyKey: uuid(`transactions-v1:${db}:${label}`) } : {}),
      },
    };
    persist();
  }
  const entry = saved[label];
  entry.result = await request(entry.path, entry.body);
  persist();
  return entry.result;
}
async function login() {
  token = (
    await request('/auth/login', { email: 'superadmin@inv.com', password: developmentPassword })
  ).token;
}
await login();
const businesses = (await request('/businesses')).businesses.filter(
  (b) =>
    b.id === developmentIds.business ||
    ['Demo Harbor Home', 'Demo City Office', 'Demo Trail Supply'].includes(b.name),
);
for (const b of businesses) {
  await login();
  const path = `/businesses/${b.id}`,
    label = (name) => `${b.id}:${name}`,
    workspace = await request(path);
  const warehouses = workspace.locations.filter(
      (l) => l.kind === 'warehouses' && l.state === 'active',
    ),
    warehouse = warehouses[0];
  if (!warehouse) continue;
  const warehouseId = warehouse.id,
    storeId = warehouse.storeId;
  const stock = await request(`${path}/stock?warehouseId=${warehouseId}&limit=100`),
    variant = stock.items.find((i) => i.sku === 'SHOW-NOTE') ?? stock.items[0];
  if (!variant) continue;
  const pricing = await request(`${path}/products/${variant.productId ?? variant.id}/pricing`),
    unitId = pricing.variants.find((v) => v.id === variant.id)?.baseUnitId ?? pricing.units[0]?.id;
  if (!unitId) throw new Error('Fixture requires a base unit.');
  const purchasing = await request(`${path}/purchasing?warehouseId=${warehouseId}`);
  let supplier = purchasing.suppliers.find((s) => s.code === 'SHOW-SUPPLIER');
  if (!supplier)
    supplier = await once(
      label('supplier'),
      `${path}/suppliers`,
      {
        name: 'Showcase Wholesale',
        code: 'SHOW-SUPPLIER',
        email: 'supplier@example.test',
        phone: '',
        notes: 'Local test supplier',
      },
      false,
    );
  let purchase = await once(label('purchase'), `${path}/purchases`, {
    supplierId: supplier.id,
    warehouseId,
    reference: 'SHOW-PO-001',
    currency: 'USD',
    lines: [{ variantId: variant.id, unitId, quantity: '20', unitCost: '3.00' }],
  });
  for (const action of ['approve', 'order'])
    purchase = await once(
      label(`purchase-${action}`),
      `${path}/purchases/${purchase.order.id}/transitions`,
      { action, version: purchase.order.version, reason: 'Development transaction fixture' },
    );
  purchase = await once(
    label('partial-receipt'),
    `${path}/purchases/${purchase.order.id}/receipts`,
    { lineId: purchase.lines[0].id, quantity: '12' },
  );
  await once(label('supplier-return'), `${path}/purchases/${purchase.order.id}/returns`, {
    receiptId: purchase.receipts[0].id,
    quantity: '1',
    reason: 'Development return example',
    creditReference: 'SHOW-CREDIT-001',
  });
  await once(label('supplier-invoice'), `${path}/purchases/${purchase.order.id}/invoices`, {
    reference: 'SHOW-INVOICE-001',
    amountMinor: '6000',
    dueDate: '2026-12-31',
  });
  const customerPage = await request(`${path}/customers?storeId=${storeId}`);
  let customer = customerPage.customers.find((c) => c.code === 'SHOW-CUSTOMER');
  if (!customer)
    customer = await once(
      label('customer'),
      `${path}/customers`,
      {
        storeId,
        code: 'SHOW-CUSTOMER',
        name: 'Jordan Sample',
        email: 'customer@example.test',
        currency: 'USD',
        notes: 'Development example customer',
      },
      false,
    );
  let terminal = workspace.locations.find(
    (l) => l.kind === 'terminals' && l.warehouseId === warehouseId && l.state === 'active',
  );
  if (!terminal)
    terminal = await once(
      label('terminal'),
      `${path}/locations`,
      {
        kind: 'terminals',
        storeId,
        warehouseId,
        code: 'SHOW-POS',
        name: 'Showcase register',
        type: 'pos',
      },
      false,
    );
  const shifts = await request(`${path}/cash-shifts?warehouseId=${warehouseId}`);
  if (
    !shifts.shifts.some(
      (s) => s.state === 'open' && s.actorId === 'de000000-0000-4000-8000-000000000001',
    )
  ) {
    // Replaying the exact open command is safe; the service owns shift uniqueness.
    if (
      !saved[label('shift')]?.result &&
      shifts.shifts.some(
        (s) => s.state === 'open' && s.actorId === 'de000000-0000-4000-8000-000000000001',
      )
    )
      saved[label('shift')] = { result: { existing: true } };
    if (!saved[label('shift')])
      await once(label('shift'), `${path}/cash-shifts`, {
        warehouseId,
        terminalId: terminal.id,
        currency: 'USD',
        openingMinor: '10000',
      });
  }
  for (let i = 0; i < 3; i++) {
    const saleLabel = label(`sale-${i}`);
    if (saved[saleLabel]?.result) continue;
    const cart = {
      warehouseId,
      customerId: customer.id,
      lines: [
        {
          variantId: variant.id,
          unitId,
          quantity: String(i + 1),
          manualDiscountBasisPoints: 0,
          locationId: null,
        },
      ],
    };
    const quote = await request(`${path}/pos/quotes`, cart);
    await once(saleLabel, `${path}/sales`, {
      ...cart,
      quoteFingerprint: quote.quoteFingerprint,
      cashAppliedMinor: quote.totalMinor,
      cashReceivedMinor: quote.totalMinor,
    });
  }
  const first = saved[label('sale-0')]?.result;
  if (first)
    await once(label('sale-return'), `${path}/sales/${first.sale.id}/returns`, {
      kind: 'return',
      reasonCode: 'unwanted',
      note: 'Development return example',
      lines: [{ saleLineId: first.lines[0].id, quantity: '1', disposition: 'restock' }],
    });
  const invoice = saved[label('supplier-invoice')].result.invoices[0];
  await once(label('supplier-payment'), `${path}/payables/${invoice.id}/settlements`, {
    kind: 'payment',
    amountMinor: '1500',
    reference: 'SHOW-SUPPLIER-PAY',
  });
  if (warehouses[1]) {
    let transfer = await once(label('transfer'), `${path}/transfers`, {
      sourceWarehouseId: warehouseId,
      destinationWarehouseId: warehouses[1].id,
      reference: 'SHOW-TRANSFER-001',
      lines: [{ variantId: variant.id, unitId, quantity: '2' }],
    });
    for (const action of ['approve', 'dispatch'])
      transfer = await once(
        label(`transfer-${action}`),
        `${path}/transfers/${transfer.transfer.id}/transitions`,
        { action, version: transfer.transfer.version, reason: 'Development transfer example' },
      );
    await once(label('transfer-receive'), `${path}/transfers/${transfer.transfer.id}/receipts`, {
      lineId: transfer.lines[0].id,
      received: '2',
      damaged: '0',
      shortage: '0',
      reason: 'Development delivery received',
    });
  }
  await once(label('count-draft'), `${path}/counts`, {
    warehouseId,
    blind: true,
    variantIds: [variant.id],
  });
  const operations = await request(`${path}/operations`);
  const employee =
    operations.staff.find((s) => s.code === 'SHOW-EMPLOYEE') ??
    (await once(
      label('employee'),
      `${path}/operations/staff`,
      {
        name: 'Taylor Sample',
        code: 'SHOW-EMPLOYEE',
        title: 'Sales assistant',
        storeId,
        salaryMinor: '80000',
        currency: 'USD',
        state: 'active',
      },
      false,
    ));
  const salary = await once(label('salary'), `${path}/operations/costs`, {
    kind: 'salary',
    staffId: employee.id,
    storeId,
    description: 'October salary',
    reference: 'SHOW-SALARY-OCT',
    periodStart: '2026-10-01',
    periodEnd: '2026-10-31',
    amountMinor: '80000',
    currency: 'USD',
  });
  await once(label('salary-payment'), `${path}/operations/costs/${salary.id}/payments`, {
    amountMinor: '40000',
    reference: 'SHOW-SALARY-PAY-1',
    paidOn: '2026-10-23',
  });
  await once(label('expense'), `${path}/operations/costs`, {
    kind: 'expense',
    staffId: null,
    storeId,
    description: 'Store supplies',
    reference: 'SHOW-EXPENSE-001',
    periodStart: '2026-10-23',
    periodEnd: '2026-10-23',
    amountMinor: '4500',
    currency: 'USD',
  });
  for (const w of warehouses) {
    const result = await request(`${path}/warehouses/${w.id}/reconciliation`);
    if (!result.consistent) throw new Error('Fixture stock reconciliation failed.');
  }
  console.log(`Prepared transaction examples for ${b.name}; stock reconciled.`);
}
console.log('Transaction fixtures complete. Repeated runs preserve checkpointed commands.');
