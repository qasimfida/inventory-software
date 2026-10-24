import { Children, isValidElement, useId } from 'react';
import type { ComponentProps } from 'react';
import { Warehouse } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/FormControls';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/Popover';
/** Page-level warehouse context; callers own scope, defaults, locks and reset behavior. */
export function WarehouseSelect({
  label,
  ...props
}: ComponentProps<typeof Select> & { label: string }) {
  const generated = useId(),
    id = props.id ?? generated;
  const selected = Children.toArray(props.children).find(
    (child) =>
      isValidElement<ComponentProps<'option'>>(child) &&
      String(child.props.value) === String(props.value),
  );
  const name = isValidElement<ComponentProps<'option'>>(selected)
    ? selected.props.children
    : 'Select warehouse';
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          disabled={props.disabled}
          aria-labelledby={`${id}-context ${id}-value`}
        >
          <Warehouse aria-hidden="true" />
          <span id={`${id}-context`} className="sr-only">
            {label}
          </span>
          <span id={`${id}-value`}>{name}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start">
        <label htmlFor={id}>{label}</label>
        <Select {...props} id={id} aria-label={label} />
      </PopoverContent>
    </Popover>
  );
}
