import { parseApiOrigin } from '@inventory/api-client';

export function browserApiOrigin(configured: unknown, pageOrigin: string, development: boolean) {
  const api = new URL(parseApiOrigin(configured));
  const page = new URL(pageOrigin);
  const loopback = ['localhost', '127.0.0.1'];
  // Expo web has no Vite proxy. Keep local cookies same-site using the page's
  // loopback alias; never rewrite remote or production API destinations.
  if (
    development &&
    api.protocol === page.protocol &&
    loopback.includes(api.hostname) &&
    loopback.includes(page.hostname)
  )
    api.hostname = page.hostname;
  return api.origin;
}

export const apiOrigin = browserApiOrigin(
  process.env.EXPO_PUBLIC_API_BASE_URL,
  window.location.origin,
  typeof __DEV__ !== 'undefined' && __DEV__,
);
