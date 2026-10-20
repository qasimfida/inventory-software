import { z } from 'zod';
import { parseEnvironment } from '../config/environment.js';
import { DatabaseService } from '../database/database.service.js';
// Trusted database operator only. Never expose this entry point through an HTTP endpoint.
let database: DatabaseService | undefined;
try {
  let input = '';
  for await (const chunk of process.stdin) {
    input += String(chunk);
    if (input.length > 4096) throw new Error();
  }
  const command = z
    .object({ action: z.enum(['grant', 'revoke']), actorId: z.uuid(), accountId: z.uuid() })
    .strict()
    .parse(JSON.parse(input) as unknown);
  database = new DatabaseService(parseEnvironment(process.env));
  await database.transaction(async (tx) => {
    const active = await tx.query(
      "SELECT id FROM auth_accounts WHERE id=ANY($1::uuid[]) AND status='active'",
      [[command.actorId, command.accountId]],
    );
    if (
      !active.rows.some((row) => row.id === command.actorId) ||
      !active.rows.some((row) => row.id === command.accountId)
    )
      throw new Error();
    if (command.action === 'grant')
      await tx.query(
        'INSERT INTO platform_administrators(account_id) VALUES($1) ON CONFLICT DO NOTHING',
        [command.accountId],
      );
    else
      await tx.query('DELETE FROM platform_administrators WHERE account_id=$1', [
        command.accountId,
      ]);
    await tx.query('INSERT INTO platform_audit(actor_id,target_id,action) VALUES($1,$2,$3)', [
      command.actorId,
      command.accountId,
      `super_admin.${command.action}`,
    ]);
    await tx.query(
      'UPDATE auth_sessions SET revoked_at=now() WHERE account_id=$1 AND revoked_at IS NULL',
      [command.accountId],
    );
  });
  process.stdout.write('{"ok":true}\n');
} catch {
  process.stderr.write('Platform role administration failed. Check operator input and database.\n');
  process.exitCode = 1;
} finally {
  await database?.onApplicationShutdown();
}
