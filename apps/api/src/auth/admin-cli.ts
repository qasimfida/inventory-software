import { z } from 'zod';
import { parseEnvironment } from '../config/environment.js';
import { DatabaseService } from '../database/database.service.js';
import { newToken, tokenHash } from './secrets.js';

// Operator-only CLI. Input on stdin avoids credentials/contact data in process arguments.
let database: DatabaseService | undefined;
try {
  if (process.argv.includes('--production')) process.env.NODE_ENV = 'production';
  let input = '';
  for await (const chunk of process.stdin) {
    input += String(chunk);
    if (input.length > 4096) throw new Error('Input too large.');
  }
  const command = z
    .discriminatedUnion('action', [
      z
        .object({
          action: z.literal('invite'),
          email: z
            .email()
            .max(254)
            .transform((value) => value.toLowerCase()),
        })
        .strict(),
      z.object({ action: z.enum(['disable', 'enable']), accountId: z.uuid() }).strict(),
      z.object({ action: z.literal('prune') }).strict(),
    ])
    .parse(JSON.parse(input) as unknown);
  database = new DatabaseService(parseEnvironment(process.env));
  if (command.action === 'invite') {
    const token = newToken();
    await database
      .query(
        `INSERT INTO auth_invitations(token_hash,email,expires_at)
      SELECT $1,$2,now()+interval '24 hours' WHERE NOT EXISTS(SELECT 1 FROM auth_accounts WHERE email=$2)
      ON CONFLICT(email) DO UPDATE SET token_hash=EXCLUDED.token_hash,expires_at=EXCLUDED.expires_at,consumed_at=NULL`,
        [tokenHash(token), command.email],
      )
      .then((result) => {
        if (!result.rowCount) throw new Error('Account exists.');
      });
    // Deliberate secret output to the operator; never write this to application logs.
    process.stdout.write(JSON.stringify({ invitationToken: token, expiresInHours: 24 }) + '\n');
  } else if (command.action === 'prune') {
    await database.query('DELETE FROM auth_rate_limits WHERE resets_at<now()');
    await database.query(
      "DELETE FROM auth_sessions WHERE absolute_expires_at<now()-interval '7 days'",
    );
    await database.query("DELETE FROM auth_invitations WHERE expires_at<now()-interval '7 days'");
    process.stdout.write('{"ok":true}\n');
  } else {
    await database.transaction(async (tx) => {
      const account = await tx.query(
        'UPDATE auth_accounts SET status=$1 WHERE id=$2 RETURNING id',
        [command.action === 'disable' ? 'disabled' : 'active', command.accountId],
      );
      if (!account.rowCount) throw new Error('Account missing.');
      await tx.query(
        'UPDATE auth_sessions SET revoked_at=now() WHERE account_id=$1 AND revoked_at IS NULL',
        [command.accountId],
      );
    });
    process.stdout.write('{"ok":true}\n');
  }
} catch {
  process.stderr.write(
    'Identity administration failed. Check input, database and account state.\n',
  );
  process.exitCode = 1;
} finally {
  await database?.onApplicationShutdown();
}
