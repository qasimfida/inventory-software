import type { DatabaseService } from '../database/database.service.js';
// The table names are a closed internal union, never request input. Both inboxes use the same lease/retry rules.
export async function deliverQueue(
  db: DatabaseService,
  table: 'security_deliveries' | 'business_deliveries',
) {
  const claims = await db.transaction((tx) =>
    tx.query<{ id: string; attempts: number }>(
      `UPDATE ${table} SET attempts=attempts+1,next_attempt_at=now()+interval '30 seconds'
    WHERE id IN (SELECT id FROM ${table} WHERE state='pending' AND attempts<8 AND next_attempt_at<=now()
      ORDER BY next_attempt_at LIMIT 25 FOR UPDATE SKIP LOCKED) RETURNING id,attempts`,
    ),
  );
  for (const claim of claims.rows) {
    try {
      await db.transaction(async (tx) => {
        const current = await tx.query(
          `SELECT id FROM ${table} WHERE id=$1 AND state='pending' AND attempts=$2 FOR UPDATE`,
          [claim.id, claim.attempts],
        );
        if (!current.rowCount) return;
        if (table === 'security_deliveries')
          await tx.query(
            'INSERT INTO security_inbox(delivery_id) VALUES($1) ON CONFLICT DO NOTHING',
            [claim.id],
          );
        await tx.query(
          `UPDATE ${table} SET state='delivered',delivered_at=now(),failure_code=NULL WHERE id=$1`,
          [claim.id],
        );
      });
    } catch {
      await db.query(
        `UPDATE ${table} SET state=CASE WHEN attempts>=8 THEN 'failed' ELSE 'pending' END,
        failure_code='INBOX_WRITE_FAILED',next_attempt_at=now()+($3*interval '1 second') WHERE id=$1 AND attempts=$2 AND state='pending'`,
        [claim.id, claim.attempts, Math.min(3600, 30 * 2 ** claim.attempts)],
      );
    }
  }
  await db.query(`UPDATE ${table} SET state='failed',failure_code='DELIVERY_INTERRUPTED'
    WHERE state='pending' AND attempts>=8 AND next_attempt_at<=now()`);
}
