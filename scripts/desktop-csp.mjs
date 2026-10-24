/** Explicit release image origins, never a scheme-wide or wildcard allowlist. */
export function desktopImageSources(value = '') {
  const origins = value
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
  for (const origin of origins) {
    const url = new URL(origin);
    if (
      url.protocol !== 'https:' ||
      url.username ||
      url.password ||
      url.pathname !== '/' ||
      url.search ||
      url.hash ||
      origin.includes('*') ||
      /[\s;'"<>]/.test(origin)
    )
      throw new Error('DESKTOP_IMAGE_ORIGINS must contain comma-separated exact HTTPS origins.');
  }
  return ["'self'", 'data:', ...new Set(origins.map((origin) => new URL(origin).origin))].join(' ');
}
