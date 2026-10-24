import { z } from 'zod';
import type { OrganizationTransport } from './organization.js';
/** Platform adapters provide a socket; this module never owns credentials or native APIs. */
export interface CatalogSocket {
  onopen: (() => void) | null;
  onmessage: ((event: { data: unknown }) => void) | null;
  onclose: (() => void) | null;
  onerror: (() => void) | null;
  send(data: string): void;
  close(): void;
}
const messageSchema = z.object({
  type: z.literal('catalog.changed'),
  revision: z.string().regex(/^\d+$/),
  clock: z.number().int(),
});
export function catalogLive(
  request: OrganizationTransport,
  connect: () => CatalogSocket,
  businessId: string,
  changed: () => void,
  scheduleTask: (work: () => void, delay: number) => () => void,
) {
  let stopped = false,
    attempt = 0,
    socket: CatalogSocket | undefined;
  let retry: (() => void) | undefined;
  let timeout: (() => void) | undefined;
  const schedule = () => {
    timeout?.();
    if (stopped || retry) return;
    retry = scheduleTask(
      () => {
        retry = undefined;
        void start();
      },
      Math.min(30000, 1000 * 2 ** Math.min(attempt++, 5)),
    );
  };
  async function start() {
    try {
      const { ticket } = z
        .object({ ticket: z.string().regex(/^[A-Za-z0-9_-]{43}$/) })
        .parse(await request(`/${businessId}/catalog-live/ticket`, 'POST'));
      if (stopped) return;
      const ws = (socket = connect());
      timeout = scheduleTask(() => ws.close(), 10000);
      ws.onopen = () => {
        if (!stopped) ws.send(ticket);
      };
      ws.onmessage = (event) => {
        if (stopped || socket !== ws || typeof event.data !== 'string') return;
        try {
          messageSchema.parse(JSON.parse(event.data));
          timeout?.();
          // Each authorized connection sends a snapshot hint, recovering events missed offline.
          timeout = scheduleTask(() => ws.close(), 65000);
          attempt = 0;
          changed();
        } catch {
          ws.close();
        }
      };
      ws.onerror = () => ws.close();
      ws.onclose = schedule;
    } catch (error) {
      // Sign-in/workspace lifecycle starts a new subscription after access is restored.
      if (
        typeof error === 'object' &&
        error &&
        'status' in error &&
        [401, 403, 404].includes(Number(error.status))
      )
        return;
      schedule();
    }
  }
  void start();
  return () => {
    stopped = true;
    retry?.();
    timeout?.();
    socket?.close();
  };
}
