import { Minus, Plus } from 'lucide-react';
import { stepQuantity } from '@inventory/api-client';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/FormControls';
export function QuantityControl({
  id,
  label,
  value,
  disabled = false,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  disabled?: boolean;
  onChange: (value: string) => void;
}) {
  const less = stepQuantity(value, -1),
    more = stepQuantity(value, 1);
  return (
    <div>
      <label htmlFor={id}>{label}</label>
      <div className="quantity-control">
        <Button
          variant="secondary"
          size="icon"
          aria-label={`Decrease ${label}`}
          disabled={disabled || less === null}
          onClick={() => less && onChange(less)}
        >
          <Minus />
        </Button>
        <Input
          id={id}
          value={value}
          inputMode="decimal"
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
        />
        <Button
          variant="secondary"
          size="icon"
          aria-label={`Increase ${label}`}
          disabled={disabled || more === null}
          onClick={() => more && onChange(more)}
        >
          <Plus />
        </Button>
      </div>
    </div>
  );
}
