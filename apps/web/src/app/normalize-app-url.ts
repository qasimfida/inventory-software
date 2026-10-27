/** Hash routing is shared with Tauri; remove only legacy browser auth prefixes. */
export function normalizeAppUrl(location: Pick<Location, 'protocol' | 'pathname' | 'hash'>) {
  if (!['http:', 'https:'].includes(location.protocol)) return null;
  if (!/^\/auth(?:\/login)?\/?$/.test(location.pathname)) return null;
  const route = location.hash.startsWith('#/') ? location.hash : '#/auth/login';
  return '/' + route;
}
