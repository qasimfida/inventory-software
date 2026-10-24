import * as Primitive from '@radix-ui/react-checkbox';
import type { ComponentProps } from 'react';
import { Check, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';
/** shadcn-style Radix checkbox; native form participation is retained by Radix. */
export function Checkbox({ className, ...props }: ComponentProps<typeof Primitive.Root>) {
  return (
    <Primitive.Root data-slot="checkbox" className={cn('ui-checkbox', className)} {...props}>
      <Primitive.Indicator>
        {props.checked === 'indeterminate' ? <Minus /> : <Check />}
      </Primitive.Indicator>
    </Primitive.Root>
  );
}
