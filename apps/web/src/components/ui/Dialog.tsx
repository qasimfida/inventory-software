// shadcn-style composition using the existing scoped Radix stack.
import * as Primitive from '@radix-ui/react-dialog';
import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils';

export const Dialog = Primitive.Root;
export const DialogTrigger = Primitive.Trigger;
export const DialogClose = Primitive.Close;

export function DialogContent({
  className,
  size = 'default',
  ...props
}: ComponentProps<typeof Primitive.Content> & { size?: 'default' | 'compact' }) {
  return (
    <Primitive.Portal>
      <Primitive.Overlay className="fixed inset-0 z-40 bg-overlay" />
      <Primitive.Content
        className={cn(
          'fixed top-1/2 left-1/2 z-50 max-h-[85dvh] w-[calc(100%-2rem)] max-w-(--dialog-width) -translate-x-1/2 -translate-y-1/2 space-y-5 overflow-y-auto overscroll-contain [overflow-wrap:anywhere] rounded-(--surface-radius) border bg-elevated p-(--panel-padding) shadow-xl',
          size === 'compact' && 'max-w-(--dialog-compact-width)',
          className,
        )}
        {...props}
      />
    </Primitive.Portal>
  );
}

export function DialogTitle({ className, ...props }: ComponentProps<typeof Primitive.Title>) {
  return <Primitive.Title className={cn('text-xl font-semibold', className)} {...props} />;
}

export function DialogDescription({
  className,
  ...props
}: ComponentProps<typeof Primitive.Description>) {
  return <Primitive.Description className={cn('text-muted-foreground', className)} {...props} />;
}
