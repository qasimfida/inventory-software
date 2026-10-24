import { CartThumbnail } from './CartThumbnail';
import { useState } from 'react';
import { QuantityControl } from '@/components/common/QuantityControl';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import type { PosModel, PosState } from '@inventory/api-client';
import { formatMinorUnits } from '@inventory/domain';
import { CartDiscount } from './CartDiscount';
import { CartLineDetails } from './CartLineDetails';
export function CartLines({
  model,
  state,
  canDiscount,
}: {
  model: PosModel;
  state: PosState;
  canDiscount: boolean;
}) {
  const disabled = state.busy || state.uncertain;
  const [selected, setSelected] = useState<number | null>(null);
  return (
    <>
      <ol className="space-y-3">
        {!state.lines.length && (
          <li className="rounded-xl bg-muted p-5 text-sm text-muted-foreground">
            Your cart is empty. Choose a product to start a sale.
          </li>
        )}
        {state.lines.map((line, index) => (
          <li key={index} className="cart-line cart-line-compact cart-line-photo">
            <CartThumbnail
              key={line.images?.[0] ?? 'missing'}
              uri={line.images?.[0]}
              name={line.name}
            />
            <div className="cart-line-info">
              <Button
                variant="link"
                className="cart-line-name"
                onClick={() => setSelected(index)}
                aria-label={`View details for ${line.name}`}
              >
                {line.name}
              </Button>
              <span className="text-xs text-muted-foreground">{line.sku}</span>
            </div>
            <div className="cart-line-controls">
              <Button
                variant="ghost"
                size="icon"
                aria-label={`Remove line ${index + 1}`}
                disabled={disabled}
                onClick={() => {
                  setSelected(null);
                  model.remove(index);
                }}
              >
                <Trash2 aria-hidden="true" className="text-destructive" />
              </Button>
            </div>
            <div className="cart-line-price-row">
              <QuantityControl
                id={`pos-qty-${index}`}
                label={`Quantity ${index + 1}`}
                value={line.quantity}
                disabled={disabled}
                onChange={(quantity) => model.edit(index, { quantity })}
              />
              <div className="cart-line-price-unit">
                {' '}
                {canDiscount && (
                  <span className="cart-line-discount">
                    <CartDiscount
                      index={index}
                      value={line.manualDiscountBasisPoints}
                      disabled={disabled}
                      onChange={(manualDiscountBasisPoints) =>
                        model.edit(index, { manualDiscountBasisPoints })
                      }
                    />
                  </span>
                )}
                {state.quote?.lines[index] && (
                  <span className="cart-line-total">
                    {formatMinorUnits(
                      state.quote.lines[index].totalMinor,
                      state.quote.lines[index].currency,
                    )}
                  </span>
                )}
                <span className="cart-line-unit text-muted-foreground">
                  {line.units.find((unit) => unit.id === line.unitId)?.code ?? 'Selected unit'}
                </span>
              </div>
            </div>
          </li>
        ))}
      </ol>
      <CartLineDetails
        index={selected}
        model={model}
        state={state}
        onClose={() => setSelected(null)}
      />
    </>
  );
}
