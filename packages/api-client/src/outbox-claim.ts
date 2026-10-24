import type { OfflineVault } from './offline-vault.js';
import type { VaultState } from './offline-state.js';

export async function claimOutbox(vault: OfflineVault, now: number, random: () => number) {
  let claimed: VaultState['outbox'] = [];
  await vault.update((state) => {
    // The CAS callback can run again. Recompute eligibility from the latest envelope.
    claimed = [];
    for (const entry of state.outbox) {
      if (!['pending', 'sending'].includes(entry.state) || entry.nextRetryAt > now) continue;
      if (entry.attempts >= 8) {
        entry.state = 'conflict';
        entry.error =
          'Retry limit reached. Outcome may be committed; review and retry the same operation.';
        continue;
      }
      if (claimed.length === 20) break;
      entry.state = 'sending';
      entry.attempts++;
      entry.error = '';
      // Persist before network I/O so restart/another window respects the same backoff.
      entry.nextRetryAt =
        now + Math.max(10000, Math.min(300000, 1000 * 2 ** entry.attempts) * (0.75 + random() / 2));
      claimed.push(entry);
    }
  });
  return claimed;
}
