import { afterEach, expect, it, vi } from 'vitest';
import { catalogLive } from './catalog-live.js';
import type { CatalogSocket } from './catalog-live.js';
import { ResourceModel } from './resource-model.js';
const schedule = (work: () => void, delay: number) => {
  const id = setTimeout(work, delay);
  return () => clearTimeout(id);
};
afterEach(() => vi.useRealTimers());
it('recovers with a fresh ticket after disconnect and ignores malformed messages and stopped callbacks', async () => {
  vi.useFakeTimers();
  const sockets: CatalogSocket[] = [];
  const connect = () => {
    const s: CatalogSocket = {
      onopen: null,
      onmessage: null,
      onclose: null,
      onerror: null,
      send: vi.fn(),
      close: vi.fn(),
    };
    sockets.push(s);
    return s;
  };
  const changed = vi.fn(),
    request = vi.fn(async () => ({ ticket: 'a'.repeat(43) }));
  const stop = catalogLive(request, connect, 'business', changed, schedule);
  await Promise.resolve();
  const first = sockets[0]!;
  first.onopen?.();
  expect(first.send).toHaveBeenCalledWith('a'.repeat(43));
  first.onmessage?.({ data: JSON.stringify({ type: 'catalog.changed', revision: '1', clock: 1 }) });
  expect(changed).toHaveBeenCalledTimes(1);
  first.onmessage?.({ data: '{bad' });
  expect(first.close).toHaveBeenCalled();
  first.onclose?.();
  await vi.advanceTimersByTimeAsync(1000);
  expect(request).toHaveBeenCalledTimes(2);
  stop();
  sockets[1]!.onmessage?.({
    data: JSON.stringify({ type: 'catalog.changed', revision: '2', clock: 2 }),
  });
  expect(changed).toHaveBeenCalledTimes(1);
});
it('preserves loaded fields during live refresh and coalesces hints during writes', async () => {
  let finish: (() => void) | undefined;
  const load = vi.fn(async () => ({ title: 'Current product' }));
  const model = new ResourceModel(load);
  await model.run();
  const refresh = model.refresh();
  expect(model.snapshot().data?.title).toBe('Current product');
  await refresh;
  const write = model.run(
    () =>
      new Promise<void>((resolve) => {
        finish = resolve;
      }),
  );
  await model.refresh();
  await model.refresh();
  expect(load).toHaveBeenCalledTimes(2);
  finish!();
  await write;
  await Promise.resolve();
  expect(load).toHaveBeenCalledTimes(4);
});
