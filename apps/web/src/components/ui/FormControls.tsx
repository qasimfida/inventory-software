import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils';

const control =
  'w-full min-w-0 min-h-(--control-height) rounded-md border border-input bg-card px-3 py-1.5 text-control text-foreground placeholder:text-muted-foreground [&[readonly]]:bg-muted [&[readonly]]:cursor-default disabled:cursor-not-allowed disabled:bg-disabled disabled:text-disabled-foreground aria-invalid:border-destructive';

export function Input({ className, ...props }: ComponentProps<'input'>) {
  return <input className={cn(control, className)} {...props} />;
}

export { Select } from './Select';

export function Textarea({ className, ...props }: ComponentProps<'textarea'>) {
  return <textarea className={cn(control, 'min-h-24 resize-y py-2', className)} {...props} />;
}

export { Checkbox } from './Checkbox';
