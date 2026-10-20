import { z } from 'zod';
import {
  leaseSchema,
  offlineSaleSchema,
  syncResultSchema,
  cartLineSchema,
  snapshotSchema,
} from '@inventory/contracts';
export const outboxEntrySchema = z.object({
  operation: offlineSaleSchema,
  state: z.enum(['pending', 'sending', 'synced', 'rejected', 'conflict']),
  attempts: z.number().int().min(0),
  nextRetryAt: z.number(),
  result: syncResultSchema.nullable(),
  error: z.string(),
});
export const vaultStateSchema = z
  .object({
    schema: z.literal(2),
    activeLeaseId: z.uuid(),
    leases: z.record(z.string(), leaseSchema),
    cache: snapshotSchema,
    cart: z.array(cartLineSchema).max(50),
    outbox: z.array(outboxEntrySchema).max(1000),
    lastSeen: z.number(),
    lastSync: z.number().nullable(),
    error: z.string(),
  })
  .strict();
export type VaultState = z.infer<typeof vaultStateSchema>;
export function migrateVault(value: unknown): VaultState {
  if (!value || typeof value !== 'object' || !('schema' in value))
    throw new Error('Corrupt offline schema. Preserve the vault for recovery.');
  if (value.schema === 1) {
    const v = value as Record<string, unknown>;
    return vaultStateSchema.parse({ ...v, schema: 2, lastSync: null, error: '' });
  }
  if (value.schema !== 2)
    throw new Error('Incompatible offline schema. Upgrade without deleting the vault.');
  return vaultStateSchema.parse(value);
}
