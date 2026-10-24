import { it, expect } from 'vitest';
import { randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, chmodSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Pool } from 'pg';
import { saleReceiptSchema, accountingPageSchema } from '@inventory/contracts';
import { saleFixture } from '../../test/sale-fixture.js';
const fixture = saleFixture();
it('restores a populated custom-format backup with immutable accounting and stock reconciliation intact', async () => {
  const f = fixture(),
    q = await f.quote(),
    today = new Date().toISOString().slice(0, 10);
  const sale = saleReceiptSchema.parse(
    (
      await f
        .api()
        .post(`${f.path}/sales`)
        .set(f.h)
        .send({
          ...f.cart(),
          quoteFingerprint: q.quoteFingerprint,
          cashAppliedMinor: q.totalMinor,
          cashReceivedMinor: q.totalMinor,
          idempotencyKey: randomUUID(),
        })
        .expect(201)
    ).body,
  );
  await f
    .api()
    .post(`${f.path}/accounting/periods`)
    .set(f.h)
    .send({ from: today, to: today, idempotencyKey: randomUUID() })
    .expect(201);
  const pending = accountingPageSchema.parse(
    (await f.api().get(`${f.path}/accounting`).set(f.h).expect(200)).body,
  );
  for (const source of pending.pending)
    await f
      .api()
      .post(`${f.path}/accounting/sources`)
      .set(f.h)
      .send({ kind: source.kind, sourceId: source.id, idempotencyKey: randomUUID() })
      .expect(201);
  const folder = mkdtempSync(join(tmpdir(), 'inventory-restore-')),
    target = `inventory_restore_test_${randomUUID().replaceAll('-', '')}`;
  const url = new URL(process.env.DATABASE_URL!);
  // Environment keeps connection credentials out of process arguments and test output.
  const env = {
    ...process.env,
    PGHOST: url.hostname,
    PGPORT: url.port || '5432',
    PGUSER: decodeURIComponent(url.username),
    PGPASSWORD: decodeURIComponent(url.password),
    PGDATABASE: url.pathname.slice(1),
  };
  let restored: Pool | undefined;
  try {
    execFileSync(
      'pg_dump',
      ['--format=custom', '--no-owner', '--no-acl', '--file', join(folder, 'backup.dump')],
      { env, stdio: 'pipe', timeout: 15000 },
    );
    chmodSync(join(folder, 'backup.dump'), 0o600);
    await f.db().query(`CREATE DATABASE "${target}"`);
    execFileSync(
      'pg_restore',
      [
        '--exit-on-error',
        '--single-transaction',
        '--no-owner',
        '--no-acl',
        '--dbname',
        target,
        join(folder, 'backup.dump'),
      ],
      { env, stdio: 'pipe', timeout: 15000 },
    );
    url.pathname = `/${target}`;
    restored = new Pool({ connectionString: url.toString() });
    expect(
      (await restored.query('SELECT total_minor::text FROM sales WHERE id=$1', [sale.sale.id]))
        .rows[0].total_minor,
    ).toBe(q.totalMinor);
    expect(
      (
        await restored.query(
          'SELECT count(*)::int n FROM accounting_journals WHERE business_id=$1',
          [f.a],
        )
      ).rows[0].n,
    ).toBe(2);
    expect(
      (
        await restored.query(
          'SELECT sum(debit)-sum(credit) AS delta FROM accounting_lines WHERE business_id=$1',
          [f.a],
        )
      ).rows[0].delta,
    ).toBe('0');
    expect(
      (
        await restored.query(`WITH m AS (SELECT business_id,variant_id,warehouse_id,location_id,sum(quantity_delta) q,sum(reserved_delta) r,sum(damaged_delta) d,sum(transit_delta) t FROM stock_movements GROUP BY 1,2,3,4)
  SELECT 1 FROM stock_balances b FULL JOIN m USING(business_id,variant_id,warehouse_id,location_id) WHERE b.on_hand IS DISTINCT FROM m.q OR b.reserved IS DISTINCT FROM m.r OR b.damaged IS DISTINCT FROM m.d OR b.in_transit IS DISTINCT FROM m.t`)
      ).rows,
    ).toEqual([]);
    await expect(
      restored.query("UPDATE accounting_journals SET reason='tampered' WHERE business_id=$1", [
        f.a,
      ]),
    ).rejects.toThrow();
    expect((await restored.query('SELECT * FROM schema_migrations ORDER BY id')).rows).toEqual(
      (await f.db().query('SELECT * FROM schema_migrations ORDER BY id')).rows,
    );
  } finally {
    await restored?.end();
    await f.db().query(`DROP DATABASE IF EXISTS "${target}" WITH (FORCE)`);
    rmSync(folder, { recursive: true, force: true });
  }
}, 40000);
