import type { PosState } from './pos-types.js';
export type HeldCartAction = { type: 'hold' | 'resume' | 'discard'; name: string };
/** Ephemeral drafts only: no quotes, tenders, operation IDs or stock reservations. */
export function changeHeldCart(state: PosState, action: HeldCartAction): Partial<PosState> | null {
  if (state.busy || state.uncertain) return null;
  const name = action.name.trim();
  if (action.type === 'hold') {
    if (!state.lines.length) return { error: 'Add an item before holding this cart.' };
    if (!name || name.length > 60) return { error: 'Use a cart name between 1 and 60 characters.' };
    if (state.heldCarts.length >= 10)
      return { error: 'Resume or discard a held cart first (maximum 10).' };
    if (state.heldCarts.some((c) => c.name.toLowerCase() === name.toLowerCase()))
      return { error: 'Choose a different cart name.' };
    return {
      heldCarts: [
        ...state.heldCarts,
        { name, lines: state.lines.map((l) => ({ ...l })), customerId: state.customerId },
      ],
      lines: [],
      customerId: null,
      quote: null,
      receipt: null,
      error: '',
    };
  }
  const cart = state.heldCarts.find((c) => c.name === name);
  if (!cart) return { error: 'This held cart is no longer available.' };
  if (action.type === 'resume' && state.lines.length)
    return { error: 'Hold or clear the active cart before resuming another.' };
  return {
    heldCarts: state.heldCarts.filter((c) => c !== cart),
    error: '',
    ...(action.type === 'resume'
      ? {
          lines: cart.lines.map((l) => ({ ...l })),
          customerId: cart.customerId,
          quote: null,
          receipt: null,
        }
      : {}),
  };
}
