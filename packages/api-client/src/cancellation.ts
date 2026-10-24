/** Structural host cancellation port; no DOM/native runtime dependency in shared code. */
export interface CancellationSignal {
  readonly aborted: boolean;
  addEventListener(type: 'abort', listener: () => void, options?: { once?: boolean }): void;
  removeEventListener(type: 'abort', listener: () => void): void;
}

export function throwIfCancelled(signal?: CancellationSignal) {
  if (signal?.aborted) throw Object.assign(new Error('Request cancelled'), { name: 'AbortError' });
}
