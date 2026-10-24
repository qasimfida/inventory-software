import { settingsPolicySchema } from '@inventory/contracts';
import type { SettingsPolicy } from '@inventory/contracts';
import { randomUUID } from 'node:crypto';
import type { Transaction } from '../database/transaction.js';

export interface SecurityEvent {
  event:
    | 'login.success'
    | 'login.denied'
    | 'login.new_device'
    | 'credentials.rate_limited'
    | 'session.renewed'
    | 'session.revoked'
    | 'session.revoked_all'
    | 'password.recovery_issued'
    | 'password.reset'
    | 'settings.platform_changed'
    | 'settings.business_changed'
    | 'settings.preferences_changed'
    | 'notifications.retry';
  outcome?: 'success' | 'denied' | 'failure';
  actorId?: string;
  businessId?: string;
  deviceId?: string;
  sessionId?: string;
  requestId?: string;
  subjectHash?: string;
  policyChange?: { before: SettingsPolicy; after: SettingsPolicy };
}
// Only typed, allowlisted fields are accepted. No request payload, UA, address or credential.
export async function securityEvent(tx: Transaction, input: SecurityEvent): Promise<string> {
  const result = await tx.query<{ id: string }>(
    `INSERT INTO security_events(event,outcome,actor_id,business_id,device_id,request_id,subject_hash,policy_change,session_id)
     VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id::text`,
    [
      input.event,
      input.outcome ?? 'success',
      input.actorId ?? null,
      input.businessId ?? null,
      input.deviceId ?? null,
      input.requestId ?? randomUUID(),
      input.subjectHash ?? null,
      input.policyChange
        ? JSON.stringify({
            before: settingsPolicySchema.parse(input.policyChange.before),
            after: settingsPolicySchema.parse(input.policyChange.after),
          })
        : null,
      input.sessionId ?? null,
    ],
  );
  return result.rows[0]!.id;
}
