import type { ComponentProps } from 'react';
import { Choice } from './Controls';
/** Native choice opens its accessible option list directly, without a second sheet. */
export function WarehouseSelect(props: ComponentProps<typeof Choice>) {
  return <Choice {...props} />;
}
