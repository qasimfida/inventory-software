import { createAuthClient } from '@inventory/api-client';
import { createCredentialStore } from './credential-store';
const baseUrl = process.env.EXPO_PUBLIC_API_BASE_URL ?? '';
export const authClient = createAuthClient(
  baseUrl,
  async (url, options) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);
    try {
      return await fetch(url, { ...options, signal: controller.signal });
    } finally {
      clearTimeout(timer);
    }
  },
  createCredentialStore(baseUrl),
);
