import { useId } from 'react';
import type { ComponentProps } from 'react';
import { Select } from '@/components/ui/FormControls';
/** Direct accessible dropdown; callers retain context ownership, scope and cart locks. */
export function WarehouseSelect({
  label,
  ...props
}: ComponentProps<typeof Select> & { label: string }) {
  const id = useId();
  return <Select {...props} id={props.id ?? id} aria-label={label} />;
}
