import { expect, it } from 'vitest';
import { onlineResultTone, canReviewOnlineResult } from './online-result-presentation.js';
it('distinguishes saved but unready products from successful publication and failures', () => {
  expect(onlineResultTone({ ok: true, code: 'needs_changes' })).toBe('warning');
  expect(onlineResultTone({ ok: true, code: 'active' })).toBe('success');
  expect(onlineResultTone({ ok: false, code: 'ALREADY_LISTED' })).toBe('warning');
  expect(onlineResultTone({ ok: false, code: 'LISTING_CHANGED' })).toBe('error');
  expect(canReviewOnlineResult('delisted')).toBe(false);
  expect(canReviewOnlineResult('needs_changes')).toBe(true);
});
