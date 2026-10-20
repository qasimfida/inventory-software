import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils';

const control =
  'w-full min-w-0 min-h-11 rounded-md border border-input bg-card px-3 py-2 text-base text-foreground placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-60 aria-invalid:border-destructive';

export function Input({ className, ...props }: ComponentProps<'input'>) {
  return <input className={cn(control, className)} {...props} />;
}

// Native select preserves platform keyboard behavior and mobile pickers.
export function Select({ className, ...props }: ComponentProps<'select'>) {
  return <select className={cn(control, className)} {...props} />;
}

export function Checkbox({ className, ...props }: Omit<ComponentProps<'input'>, 'type'>) {
  return (
    <input
      type="checkbox"
      className={cn('size-5 shrink-0 accent-primary disabled:opacity-60', className)}
      {...props}
    />
  );
}
