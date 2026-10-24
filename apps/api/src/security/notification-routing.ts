import { randomUUID } from 'node:crypto';
import { notificationPolicy } from '@inventory/contracts';
import type { Transaction } from '../database/transaction.js';
import { readPolicy } from '../settings/settings-store.js';

export async function routeNewDevice(tx: Transaction, eventId: string, accountId: string) {
  const platform = (await readPolicy(tx)).values;
  const global = notificationPolicy(platform);
  async function enqueue(recipient: string, audience: string, businessId: string | null = null) {
    await tx.query(
      `INSERT INTO security_deliveries(id,event_id,recipient_id,audience,business_id)
      VALUES($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING`,
      [randomUUID(), eventId, recipient, audience, businessId],
    );
  }
  if (global.notifyUser) await enqueue(accountId, 'self');
  if (global.notifyPlatformAdmins) {
    const admins = await tx.query<{
      account_id: string;
    }>(`SELECT p.account_id FROM platform_administrators p
      JOIN auth_accounts a ON a.id=p.account_id WHERE a.status='active'`);
    for (const admin of admins.rows) await enqueue(admin.account_id, 'platform-admin');
  }
  const businesses = await tx.query<{ business_id: string }>(
    `SELECT m.business_id FROM business_memberships m
    JOIN businesses b ON b.id=m.business_id WHERE m.account_id=$1 AND m.state='active' AND b.state='active'`,
    [accountId],
  );
  for (const { business_id: id } of businesses.rows) {
    if (!notificationPolicy(platform, (await readPolicy(tx, id)).values).notifyBusinessAdmins)
      continue;
    const owners = await tx.query<{ account_id: string }>(
      `SELECT m.account_id FROM business_memberships m
      JOIN auth_accounts a ON a.id=m.account_id WHERE m.business_id=$1 AND m.state='active'
      AND m.role='owner' AND a.status='active'`,
      [id],
    );
    for (const owner of owners.rows) await enqueue(owner.account_id, 'business-admin', id);
  }
}
