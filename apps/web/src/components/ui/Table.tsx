import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils';

export function Table({ className, ...props }: ComponentProps<'table'>) {
  return <table className={cn('data-table', className)} {...props} />;
}

/* eslint-disable jsx-a11y/no-noninteractive-tabindex -- Named table region must support keyboard scrolling. */
/** Keep overflowing exact values readable and keyboard-scrollable without fetching more data. */
export function TableScroll({
  label,
  className,
  ...props
}: ComponentProps<'div'> & { label: string }) {
  return (
    <div
      role="region"
      aria-label={label}
      tabIndex={0}
      className={cn('min-w-0 max-w-full overflow-auto', className)}
      {...props}
    />
  );
}

/* eslint-enable jsx-a11y/no-noninteractive-tabindex */
