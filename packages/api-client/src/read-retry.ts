import { throwIfCancelled } from './cancellation.js';
import type { AuthTransport } from './auth.js';

// Hosts own clocks, cancellation and fetch. Never retry a mutation here.
export function withReadRetries(
  transport: AuthTransport,
  pause: (ms: number) => Promise<void>,
): AuthTransport {
  return async (url, options) => {
    const safe = options.method === 'GET' || options.method === 'HEAD';
    for (let attempt = 0; ; attempt++) {
      throwIfCancelled(options.signal);
      try {
        const response = await transport(url, options);
        if (!safe || attempt >= 2 || ![502, 503, 504].includes(response.status)) return response;
      } catch (error) {
        if (options.signal?.aborted || !safe || attempt >= 2) throw error;
      }
      await pause(250 * 2 ** attempt);
    }
  };
}
