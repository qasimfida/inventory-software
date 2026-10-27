import { useState } from 'react';
import type { PosModel, PosState } from '@inventory/api-client';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/FormControls';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
export function HeldCarts({ model, state }: { model: PosModel; state: PosState }) {
  const [name, setName] = useState('');
  const locked = state.busy || state.uncertain;
  return (
    <section aria-label="Held carts" className="space-y-2">
      <h4>Held carts ({state.heldCarts.length}/10)</h4>
      <p className="text-sm text-muted-foreground">
        Session only. Leaving POS, reload or sign-out clears drafts. No stock is reserved; prices
        are checked again on resume.
      </p>
      <label htmlFor="held-cart-name">Cart name (avoid personal information)</label>
      <div className="flex flex-wrap gap-2">
        <Input
          id="held-cart-name"
          value={name}
          maxLength={60}
          disabled={locked}
          onChange={(e) => setName(e.target.value)}
        />
        <Button
          disabled={locked || !state.lines.length || !name.trim()}
          onClick={() => model.heldCart({ type: 'hold', name })}
        >
          Hold current cart
        </Button>
      </div>
      {state.heldCarts.map((cart) => (
        <div key={cart.name} className="flex flex-wrap items-center gap-2">
          <span>
            {cart.name} · {cart.lines.length} lines
          </span>
          <Button
            variant="outline"
            disabled={locked || !!state.lines.length}
            onClick={() => model.heldCart({ type: 'resume', name: cart.name })}
          >
            Resume {cart.name}
          </Button>
          <ConfirmDialog
            title="Discard held cart?"
            description={`Discard ${cart.name}? This only removes an unsubmitted session draft.`}
            confirmLabel="Discard draft"
            trigger={
              <Button variant="ghost" disabled={locked}>
                Discard {cart.name}
              </Button>
            }
            onConfirm={() => model.heldCart({ type: 'discard', name: cart.name })}
          />
        </div>
      ))}
    </section>
  );
}
