import { ResourceModel } from './resource-model.js';
import type { CancellationSignal } from './cancellation.js';
/** Host owns cancellation; each load gets a fresh signal, including StrictMode restarts. */
export function cancellableResource<T>(
  load: (signal: CancellationSignal) => Promise<T>,
  create: () => { signal: CancellationSignal; abort: () => void },
) {
  let current: ReturnType<typeof create> | undefined;
  const model = new ResourceModel(() => {
    current?.abort();
    current = create();
    return load(current.signal);
  });
  return {
    model,
    cancel: () => {
      current?.abort();
      model.reset();
    },
  };
}
