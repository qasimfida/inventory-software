import { parseApiOrigin } from '@inventory/api-client';

export function resolveApiOrigin(
  configured: unknown,
  pageOrigin: string,
  development: boolean,
  desktop: boolean,
) {
  const origin = parseApiOrigin(configured);
  // Vite forwards /api to the configured backend. Same-origin browser requests keep
  // Strict cookies working on both localhost and 127.0.0.1 without weakening CSRF protection.
  return development && !desktop ? pageOrigin : origin;
}

export const apiOrigin = resolveApiOrigin(
  import.meta.env.VITE_API_BASE_URL,
  window.location.origin,
  import.meta.env.DEV,
  '__TAURI_INTERNALS__' in window,
);
