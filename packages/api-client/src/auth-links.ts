export interface AuthLink {
  kind: 'reset' | 'invitation';
  email: string;
  token: string;
}
/** External links are data, never arbitrary navigation or authority to reset an account. */
export function parseAuthLink(input: string, httpsOrigin?: string): AuthLink | null {
  try {
    const match = /^(https:|inventory:)\/\/([^/?#]+)(\/[^?#]*)?(?:\?([^#]*))?(?:#(.*))?$/.exec(
      input,
    );
    if (!match) return null;
    const [, protocol, authority, pathname = '/', query = '', fragment = ''] = match;
    const custom = protocol === 'inventory:' && authority === 'auth';
    const secure =
      protocol === 'https:' && httpsOrigin === `https://${authority}` && !authority?.includes('@');
    if (!custom && !secure) return null;
    const path = custom
      ? '/auth' + pathname
      : fragment.startsWith('/auth/')
        ? fragment.split('?')[0]
        : pathname;
    if (!['/auth/reset', '/auth/invitation', '/auth/link'].includes(path ?? '')) return null;
    const values = new Map(
      (fragment.startsWith('/auth/') ? (fragment.split('?')[1] ?? '') : fragment || query)
        .split('&')
        .map((pair) => {
          const [key = '', value = ''] = pair.split('=');
          return [decodeURIComponent(key), decodeURIComponent(value.replace(/\+/g, ' '))];
        }),
    );
    const parameters = values;
    const kind =
      path === '/auth/invitation' || parameters.get('kind') === 'invitation'
        ? 'invitation'
        : 'reset';
    const email = parameters.get('email')?.trim().toLowerCase() ?? '';
    const token = parameters.get('token') ?? '';
    if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
      email.length > 254 ||
      !/^[A-Za-z0-9_-]{43}$/.test(token)
    )
      return null;
    return { kind, email, token };
  } catch {
    return null;
  }
}
export function authAppLink(link: AuthLink) {
  return `inventory://auth/${link.kind}#email=${encodeURIComponent(link.email)}&token=${encodeURIComponent(link.token)}`;
}
export function passwordGuidance(password: string) {
  if (password.length < 15) return 'Use at least 15 characters; a memorable passphrase works well.';
  if (password.length > 128) return 'Use no more than 128 characters.';
  return password.length >= 24
    ? 'Long passphrase. Avoid reused or compromised passwords.'
    : 'Meets the length requirement. A longer, unique passphrase is stronger.';
}
