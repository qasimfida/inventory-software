import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils';

export function Table({ className, ...props }: ComponentProps<'table'>) {
  return (
    <table
      className={cn(
        'w-full border-collapse text-left text-sm [&_caption]:pb-4 [&_caption]:text-left [&_caption]:text-muted-foreground [&_th]:font-semibold [&_th]:text-foreground [&_th]:align-top [&_td]:align-top [&_th]:p-3 [&_td]:p-3 [&_tr]:border-b [&_thead]:bg-muted [&_tbody_tr:hover]:bg-muted/60',
        className,
      )}
      {...props}
    />
  );
}
