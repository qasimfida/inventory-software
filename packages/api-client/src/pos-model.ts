import { cartSchema, checkoutSchema } from '@inventory/contracts';
import type { Checkout } from '@inventory/contracts';
import type { createSalesClient } from './sales.js';
type Client = ReturnType<typeof createSalesClient>;
import type { PosItem, DraftLine, PosState } from './pos-types.js';
export class PosModel {
  private state: PosState = {
    lines: [],
    customerId: null,
    quote: null,
    receipt: null,
    busy: false,
    uncertain: false,
    error: '',
  };
  private generation = 0;
  private invalidation = 0;
  private pending: Omit<Checkout, 'idempotencyKey'> | null = null;
  private listeners = new Set<() => void>();
  constructor(
    private readonly client: Client,
    readonly warehouseId: string,
  ) {}
  snapshot = () => this.state;
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
  private publish(patch: Partial<PosState>) {
    this.state = { ...this.state, ...patch };
    this.listeners.forEach((l) => l());
  }
  invalidate() {
    this.invalidation++;
    if (this.state.busy || this.state.uncertain) return;
    this.generation++;
    this.publish({
      quote: null,
      error: this.state.lines.length
        ? 'Prices or stock may have changed. Calculate and review again.'
        : '',
    });
  }
  reset = () => {
    this.generation++;
    this.pending = null;
    this.publish({
      lines: [],
      customerId: null,
      quote: null,
      receipt: null,
      busy: false,
      uncertain: false,
      error: '',
    });
  };
  private editable() {
    return !this.state.busy && !this.state.uncertain;
  }
  add(item: PosItem) {
    if (!this.editable() || this.state.lines.length >= 50) return;
    this.publish({
      lines: [
        ...this.state.lines,
        {
          variantId: item.id,
          unitId: item.unitId,
          name: item.name,
          sku: item.sku,
          units: item.units,
          quantity: '1',
          locationId: null,
          manualDiscountBasisPoints: 0,
        },
      ],
      quote: null,
      receipt: null,
      error: '',
    });
  }
  edit(
    index: number,
    patch: Partial<
      Pick<DraftLine, 'quantity' | 'unitId' | 'locationId' | 'manualDiscountBasisPoints'>
    >,
  ) {
    if (!this.editable()) return;
    this.publish({
      lines: this.state.lines.map((l, i) => (i === index ? { ...l, ...patch } : l)),
      quote: null,
      error: '',
    });
  }
  remove(index: number) {
    if (this.editable())
      this.publish({
        lines: [...this.state.lines.slice(0, index), ...this.state.lines.slice(index + 1)],
        quote: null,
        error: '',
      });
  }
  customer(id: string | null) {
    if (this.editable()) this.publish({ customerId: id, quote: null, error: '' });
  }
  private cart() {
    return cartSchema.parse({
      warehouseId: this.warehouseId,
      customerId: this.state.customerId,
      lines: this.state.lines.map(
        ({ variantId, unitId, quantity, locationId, manualDiscountBasisPoints }) => ({
          variantId,
          unitId,
          quantity,
          locationId,
          manualDiscountBasisPoints,
        }),
      ),
    });
  }
  async preview() {
    if (!this.editable()) return;
    const generation = ++this.generation,
      version = this.invalidation;
    this.publish({ busy: true, error: '', quote: null });
    try {
      const quote = await this.client.quote(this.cart());
      if (generation === this.generation)
        this.publish({
          quote: version === this.invalidation ? quote : null,
          busy: false,
          error:
            version === this.invalidation
              ? ''
              : 'Prices or stock changed during calculation. Calculate and review again.',
        });
    } catch (error) {
      if (generation === this.generation) this.publish({ busy: false, error: this.message(error) });
    }
  }
  async checkout(
    cashAppliedMinor: string,
    cashReceivedMinor: string,
    creditOverrideReason = '',
    exchangeReturnId = '',
  ) {
    if (this.state.busy) return;
    if (!this.pending) {
      if (!this.state.quote) {
        this.publish({ error: 'Calculate the current total before checkout.' });
        return;
      }
      try {
        this.pending = {
          ...this.cart(),
          quoteFingerprint: this.state.quote.quoteFingerprint,
          cashAppliedMinor,
          cashReceivedMinor,
          creditOverrideReason,
          ...(exchangeReturnId ? { exchangeReturnId } : {}),
        };
        checkoutSchema.parse({
          ...this.pending,
          idempotencyKey: '00000000-0000-4000-8000-000000000000',
        });
      } catch (error) {
        this.pending = null;
        this.publish({ error: this.message(error) });
        return;
      }
    }
    const retryingUnknown = this.state.uncertain,
      generation = ++this.generation;
    this.publish({ busy: true, error: '' });
    try {
      const receipt = await this.client.checkout(this.pending);
      if (generation !== this.generation) return;
      this.pending = null;
      this.publish({ receipt, lines: [], quote: null, busy: false, uncertain: false });
    } catch (error) {
      if (generation !== this.generation) return;
      const status = error instanceof Error && 'status' in error ? Number(error.status) : 0,
        definite = !retryingUnknown && status >= 400 && status < 500 && status !== 408;
      if (definite) this.pending = null;
      this.publish({
        busy: false,
        uncertain: !definite,
        error: definite
          ? this.message(error)
          : 'Checkout outcome is unknown. Retry the same checkout. Inspect sale history before starting another sale after reload or sign-in.',
      });
    }
  }
  private message(error: unknown) {
    return error instanceof Error && 'status' in error
      ? error.message
      : 'Check quantities, currency amounts and required selections, then retry.';
  }
}
