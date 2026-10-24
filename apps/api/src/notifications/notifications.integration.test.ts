import { expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { approvalQueueSchema, businessInboxSchema } from '@inventory/contracts';
import { stockFixture } from '../../test/stock-fixture.js';
import { native } from '../../test/auth-fixture.js';
import { NotificationWorker } from '../security/notification-worker.js';
import { DatabaseService } from '../database/database.service.js';
const fixture = stockFixture();
it('queues audit notifications atomically, retries delivery after restart, and revalidates recipient permissions', async () => {
  const f = fixture(),
    path = `${f.root}/${f.a}`,
    h = native(f.ownerToken),
    worker = f.application().get(NotificationWorker);
  await worker.onModuleDestroy();
  const supplier = await f
    .api()
    .post(`${path}/suppliers`)
    .set(h)
    .send({ name: 'Notify supplier', code: 'NOTIFY' })
    .expect(201);
  const input = {
    supplierId: supplier.body.id as string,
    warehouseId: f.warehouseA,
    reference: 'PO-NOTIFY',
    currency: 'USD',
    lines: [{ variantId: f.variantId, unitId: f.unitId, quantity: '3', unitCost: '1' }],
    idempotencyKey: randomUUID(),
  };
  const order = await f.api().post(`${path}/purchases`).set(h).send(input).expect(201);
  await f.api().post(`${path}/purchases`).set(h).send(input).expect(201);
  expect(
    (
      await f
        .db()
        .query('SELECT count(*)::int AS n FROM business_deliveries WHERE business_id=$1', [f.a])
    ).rows[0].n,
  ).toBe(2);
  const queue = approvalQueueSchema.parse(
    (await f.api().get(`${path}/notifications/approvals`).set(h).expect(200)).body,
  );
  expect(queue.items.map((i) => i.id)).toContain(order.body.order.id);
  expect(
    approvalQueueSchema.parse(
      (await f.api().get(`${path}/notifications/approvals`).set(native(f.viewerToken)).expect(200))
        .body,
    ).items,
  ).toEqual([]);
  await f.api().get(`${f.root}/${f.b}/notifications`).set(h).expect(404);
  expect(
    businessInboxSchema.parse((await f.api().get(`${path}/notifications`).set(h).expect(200)).body)
      .notifications,
  ).toEqual([]);
  await f.db()
    .query(`CREATE FUNCTION fail_business_delivery() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.state='delivered' THEN RAISE EXCEPTION 'restricted detail'; END IF; RETURN NEW; END; $$;
    CREATE TRIGGER fail_business_delivery BEFORE UPDATE ON business_deliveries FOR EACH ROW EXECUTE FUNCTION fail_business_delivery()`);
  await worker.flush();
  expect(
    (
      await f
        .db()
        .query('SELECT attempts,next_attempt_at>now() AS backoff FROM business_deliveries LIMIT 1')
    ).rows[0],
  ).toEqual({ attempts: 1, backoff: true });
  await worker.flush();
  await f
    .db()
    .query(
      'DROP TRIGGER fail_business_delivery ON business_deliveries; DROP FUNCTION fail_business_delivery(); UPDATE business_deliveries SET next_attempt_at=now()',
    );
  const restarted = new NotificationWorker(f.application().get(DatabaseService));
  await Promise.all([worker.flush(), restarted.flush()]);
  const inbox = businessInboxSchema.parse(
    (await f.api().get(`${path}/notifications`).set(h).expect(200)).body,
  );
  expect(inbox.notifications).toHaveLength(1);
  const own = inbox.notifications[0]!;
  expect(
    (await f.api().get(`${path}/notifications?status=unread&search=purchase`).set(h).expect(200))
      .body.notifications,
  ).toHaveLength(1);
  expect(
    (await f.api().get(`${path}/notifications?search=does-not-exist`).set(h).expect(200)).body
      .notifications,
  ).toHaveLength(0);
  await f.api().get(`${path}/notifications?status=invalid`).set(h).expect(400);
  await f.api().post(`${path}/notifications/${own.id}/read`).set(h).expect(201);
  expect(
    (await f.api().get(`${path}/notifications?status=unread`).set(h).expect(200)).body
      .notifications,
  ).toHaveLength(0);
  expect(
    (await f.api().get(`${path}/notifications?status=read`).set(h).expect(200)).body.notifications,
  ).toHaveLength(1);
  await f.api().post(`${path}/notifications/${own.id}/read`).set(h).expect(201);
  await f
    .api()
    .post(`${path}/notifications/${own.id}/read`)
    .set(native(f.managerToken))
    .expect(404);
  await f
    .db()
    .query("UPDATE business_memberships SET role='viewer' WHERE business_id=$1 AND account_id=$2", [
      f.a,
      f.managerId,
    ]);
  expect(
    businessInboxSchema.parse(
      (await f.api().get(`${path}/notifications`).set(native(f.managerToken)).expect(200)).body,
    ).notifications,
  ).toEqual([]);
  await f
    .api()
    .post(`${path}/purchases/${order.body.order.id}/transitions`)
    .set(native(f.managerToken))
    .send({
      action: 'approve',
      version: 1,
      reason: 'Approved after review',
      idempotencyKey: randomUUID(),
    })
    .expect(403);
  await f.api().get(`${path}/notifications/failures`).set(native(f.viewerToken)).expect(403);
  const approve = {
    action: 'approve',
    version: 1,
    reason: 'Reviewed supplier order',
    idempotencyKey: randomUUID(),
  };
  for (const attempt of [1, 2]) {
    void attempt;
    await f
      .api()
      .post(`${path}/purchases/${order.body.order.id}/transitions`)
      .set(h)
      .send(approve)
      .expect(201);
  }
  const approvalAudit = await f
    .db()
    .query(
      "SELECT after_data FROM organization_audit WHERE business_id=$1 AND action='purchase.approve'",
      [f.a],
    );
  expect(approvalAudit.rows).toHaveLength(1);
  expect(approvalAudit.rows[0].after_data.approvalReason).toBe(approve.reason);
  expect(
    approvalQueueSchema.parse(
      (await f.api().get(`${path}/notifications/approvals`).set(h).expect(200)).body,
    ).items,
  ).toEqual([]);
  await f
    .db()
    .query(
      "UPDATE business_deliveries SET state='pending',attempts=8,next_attempt_at=now() WHERE id=$1",
      [own.id],
    );
  await restarted.flush();
  const failures = await f.api().get(`${path}/notifications/failures`).set(h).expect(200);
  expect(failures.body.deliveries[0]).toMatchObject({
    id: own.id,
    state: 'failed',
    failureCode: 'DELIVERY_INTERRUPTED',
  });
  await f
    .api()
    .post(`${path}/notifications/${own.id}/retry`)
    .set(native(f.viewerToken))
    .expect(403);
  await f.api().post(`${path}/notifications/${own.id}/retry`).set(h).expect(201);
  await restarted.flush();
  expect(
    (await f.db().query('SELECT state,attempts FROM business_deliveries WHERE id=$1', [own.id]))
      .rows[0],
  ).toEqual({ state: 'delivered', attempts: 1 });
});
it('rolls audit and queue back with failed commands and deduplicates low-stock crossings', async () => {
  const f = fixture(),
    path = `${f.root}/${f.a}`,
    h = native(f.ownerToken);
  const movement = {
    warehouseId: f.warehouseA,
    variantId: f.variantId,
    unitId: f.unitId,
    quantity: '2',
    type: 'opening',
    reason: 'Initial recorded stock',
    idempotencyKey: randomUUID(),
  };
  await f.api().post(`${path}/stock/movements`).set(h).send(movement).expect(201);
  const failed = {
    ...movement,
    type: 'adjustment_out',
    quantity: '3',
    idempotencyKey: randomUUID(),
  };
  const before = (await f.db().query('SELECT count(*)::int AS n FROM business_deliveries')).rows[0]
    .n;
  await f.api().post(`${path}/stock/movements`).set(h).send(failed).expect(409);
  expect((await f.db().query('SELECT count(*)::int AS n FROM business_deliveries')).rows[0].n).toBe(
    before,
  );
  const consume = { ...movement, type: 'adjustment_out', idempotencyKey: randomUUID() };
  await f.api().post(`${path}/stock/movements`).set(h).send(consume).expect(201);
  await f.api().post(`${path}/stock/movements`).set(h).send(consume).expect(201);
  expect(
    (
      await f
        .db()
        .query("SELECT count(*)::int AS n FROM organization_audit WHERE action='stock.low'")
    ).rows[0].n,
  ).toBe(1);
});
