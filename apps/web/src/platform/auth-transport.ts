import { withReadRetries } from '@inventory/api-client';
export const authTransport = withReadRetries(
  async (url, options) => {
    const controller = new AbortController();
    const abort = () => controller.abort();
    options.signal?.addEventListener('abort', abort, { once: true });
    if (options.signal?.aborted) controller.abort();
    const timer = setTimeout(() => controller.abort(), 10000);
    try {
      const response = await fetch(url, { ...options, signal: controller.signal });
      // Consume inside the deadline: receiving headers is not a completed request.
      const body: unknown = await response.json().catch((error: unknown) => {
        if (error instanceof SyntaxError) return undefined;
        throw error;
      });
      return { ok: response.ok, status: response.status, json: async () => body };
    } finally {
      clearTimeout(timer);
      options.signal?.removeEventListener('abort', abort);
    }
  },
  (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
);
