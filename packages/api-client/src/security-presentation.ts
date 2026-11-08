import type { SecurityState } from './settings/security-model.js';
type Event = SecurityState['events'][number];
const labels: Record<string, [string, string]> = {
  'login.success': ['Login attempt', 'The account signed in successfully.'],
  'auth.login': ['Login attempt', 'A sign-in attempt was recorded for this account.'],
  'login.denied': ['Login attempt', 'Sign-in was denied. No session was granted by this attempt.'],
  'login.new_device': [
    'New device sign-in',
    'The account signed in from a newly registered installation.',
  ],
  'credentials.rate_limited': [
    'Sign-in temporarily limited',
    'Further credential attempts were temporarily limited to protect the account.',
  ],
  'session.renewed': ['Session renewed', 'An existing signed-in session was renewed.'],
  'session.revoked': [
    'Session ended',
    'A session was revoked and can no longer authorize requests.',
  ],
  'session.revoked_all': ['All sessions ended', 'The account’s active sessions were revoked.'],
  'password.recovery_issued': [
    'Password recovery issued',
    'An authorized operator issued password recovery instructions.',
  ],
  'password.reset': ['Password reset', 'The account password was reset.'],
  'settings.platform_changed': [
    'Platform settings updated',
    'Platform settings were updated by an authorized administrator.',
  ],
  'settings.business_changed': [
    'Business settings updated',
    'Business settings were updated by an authorized member.',
  ],
  'settings.preferences_changed': [
    'Preferences updated',
    'The account’s personal preferences were updated.',
  ],
  'notifications.retry': [
    'Notification delivery retried',
    'An administrator requested another notification delivery attempt.',
  ],
};
export function securityEventPresentation(event: string) {
  const [title, description] = labels[event] ?? [
    'Security activity',
    'A security event was recorded. Review its outcome and context below.',
  ];
  return { title, description };
}
export function securityActor(event: {
  actorId: string | null;
  actorName?: string | null | undefined;
}) {
  return (
    event.actorName || (event.actorId ? 'Account name unavailable' : 'Unidentified user or system')
  );
}
/** Device-local time; full details include seconds and the time zone. */
export function securityTime(value: string, full = false, timeZone?: string) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return 'Time unavailable';
  if (full)
    return new Intl.DateTimeFormat('en-US', {
      dateStyle: 'full',
      timeStyle: 'long',
      timeZone,
    }).format(date);
  const day = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone,
  }).format(date);
  const time = new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone,
  }).format(date);
  return `${day} ${time}`;
}
export function securityEventDetails(event: Event): [string, string][] {
  const fields: [string, string][] = [
    ['Event', securityEventPresentation(event.event).title],
    ['User', securityActor(event)],
    ['Date and time', securityTime(event.occurredAt, true)],
    ['Outcome', { success: 'Successful', denied: 'Denied', failure: 'Failed' }[event.outcome]],
  ];
  if (event.policyChange) {
    for (const phase of ['before', 'after'] as const) {
      const flatten = (value: unknown, path: string): void => {
        if (value && typeof value === 'object') {
          const entries = Object.entries(value);
          if (!entries.length) fields.push([path, 'None']);
          for (const [key, child] of entries)
            flatten(child, `${path} · ${key.replace(/([A-Z])/g, ' $1').toLowerCase()}`);
        } else fields.push([path, String(value ?? 'Not set')]);
      };
      flatten(
        event.policyChange[phase],
        phase === 'before' ? 'Previous settings' : 'Updated settings',
      );
    }
  }
  for (const [label, value] of [
    ['Business reference', event.businessId],
    ['Device reference', event.deviceId],
    ['Session reference', event.sessionId],
    ['Event reference', event.id],
    ['Support reference', event.requestId],
  ] as const) {
    if (value) fields.push([label, value]);
  }
  return fields;
}
