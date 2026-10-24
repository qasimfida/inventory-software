import type { PosModel } from './pos-model.js';
/** Quotes are read-only. Never invokes checkout or retries an uncertain sale. */
export function observeCartQuotes(model: PosModel, schedule: (work: () => void) => () => void) {
  let previous = '',
    cancel: (() => void) | undefined;
  function update() {
    const state = model.snapshot();
    const key = JSON.stringify([state.lines, state.customerId, model.quoteRevision]);
    if (key === previous) return;
    previous = key;
    cancel?.();
    if (!state.lines.length || state.uncertain || state.busy) return;
    cancel = schedule(() => {
      void model.preview();
    });
  }
  const unsubscribe = model.subscribe(update);
  update();
  return () => {
    cancel?.();
    unsubscribe();
  };
}
