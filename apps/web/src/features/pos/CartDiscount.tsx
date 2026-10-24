import { useState } from 'react';
import { Tag } from 'lucide-react';
import { percentageBasisPoints } from '@inventory/domain';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/Popover';
import { Input } from '@/components/ui/FormControls';
import { Button } from '@/components/ui/Button';
export function CartDiscount({
  index,
  value,
  disabled,
  onChange,
}: {
  index: number;
  value: number;
  disabled: boolean;
  onChange: (value: number) => void;
}) {
  const [open, setOpen] = useState(false),
    [error, setError] = useState('');
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          title={value ? `${value / 100}% discount` : 'Add discount'}
          disabled={disabled}
          aria-label={`Discount for line ${index + 1}`}
        >
          <Tag aria-hidden="true" />
        </Button>
      </PopoverTrigger>
      <PopoverContent>
        <form
          className="space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            try {
              onChange(
                percentageBasisPoints(String(new FormData(event.currentTarget).get('discount'))),
              );
              setError('');
              setOpen(false);
            } catch {
              setError('Enter a percentage from 0 to 100 with at most two decimal places.');
            }
          }}
        >
          <label htmlFor={`discount-${index}`}>Manual discount (%)</label>
          <Input
            id={`discount-${index}`}
            name="discount"
            type="number"
            min="0"
            max="100"
            step="0.01"
            defaultValue={value / 100}
            required
          />
          {error && <p role="alert">{error}</p>}
          <Button type="submit" disabled={disabled}>
            Apply discount
          </Button>
        </form>
      </PopoverContent>
    </Popover>
  );
}
