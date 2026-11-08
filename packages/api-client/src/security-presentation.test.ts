import { expect, it } from 'vitest';
import {
  securityActor,
  securityEventDetails,
  securityEventPresentation,
  securityTime,
} from './security-presentation.js';
it('uses readable labels and an explicit date format without inventing names', () => {
  expect(securityEventPresentation('login.success').title).toBe('Login attempt');
  expect(securityEventPresentation('login.denied').description).toContain('denied');
  expect(securityTime('2026-11-03T09:40:00Z', false, 'Asia/Karachi')).toBe('Nov 3, 2026 2:40 PM');
  expect(securityTime('2026-11-03T09:40:00Z', true, 'UTC')).toContain('Tuesday, November 3, 2026');
  expect(securityActor({ actorId: 'internal-id', actorName: 'Jane' })).toBe('Jane');
  expect(securityActor({ actorId: 'internal-id' })).not.toContain('internal-id');
});
it('builds local labelled details including policy changes and secondary references', () => {
  const details = securityEventDetails({
    id: '1',
    occurredAt: '2026-11-03T09:40:00Z',
    actorId: null,
    businessId: null,
    deviceId: null,
    sessionId: null,
    requestId: 'support',
    event: 'login.denied',
    outcome: 'denied',
    policyChange: null,
  });
  expect(details).toContainEqual(['Outcome', 'Denied']);
  expect(details).toContainEqual(['Support reference', 'support']);
  expect(details.some(([label]) => label === 'Date and time')).toBe(true);
});
