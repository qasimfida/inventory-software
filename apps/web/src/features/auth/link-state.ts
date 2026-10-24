import { parseAuthLink } from '@inventory/api-client';
import type { AuthLink } from '@inventory/api-client';
let pending: AuthLink | null = null;
export const pendingAuthLink = {
  get: () => pending,
  set: (link: AuthLink) => {
    pending = link;
  },
  clear: () => {
    pending = null;
  },
};
export function captureWebAuthLink() {
  const origin = window.location.protocol === 'https:' ? window.location.origin : undefined;
  const link = parseAuthLink(window.location.href, origin);
  const sensitivePath = /^\/auth\/(reset|invitation|link)\/?$/.test(window.location.pathname);
  if (!link && !sensitivePath) return;
  if (link) pendingAuthLink.set(link);
  else pendingAuthLink.clear();
  // Remove the secret before any page rendering, analytics or navigation can copy it.
  window.history.replaceState(null, '', '/#/auth/link');
}
