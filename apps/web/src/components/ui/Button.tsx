import { Hint } from './Tooltip';
// shadcn/ui new-york-v4 Button; import paths adapted to local utilities and scoped Radix Slot.
import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import { LoaderCircle } from 'lucide-react';
import { Slot } from '@radix-ui/react-slot';

const buttonVariants = cva(
  "relative inline-flex border border-transparent max-w-full shrink-0 items-center justify-center gap-2 rounded-md text-control font-medium whitespace-normal break-words transition-shadow active:ring-2 active:ring-inset active:ring-current aria-pressed:ring-2 aria-pressed:ring-ring disabled:pointer-events-none disabled:bg-disabled disabled:text-disabled-foreground aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/90',
        destructive:
          'bg-destructive text-destructive-foreground hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40',
        outline:
          'border-border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        default: 'min-h-(--control-height) px-4 py-1.5',
        xs: "min-h-(--control-small) gap-1 rounded-md px-2 py-1 text-xs [&_svg:not([class*='size-'])]:size-3",
        sm: 'min-h-(--control-small) gap-1.5 rounded-md px-3 py-1',
        lg: 'min-h-(--control-large) rounded-md px-5 py-2',
        icon: 'size-(--control-icon) p-0',
        'icon-xs': "size-(--control-small) rounded-md [&_svg:not([class*='size-'])]:size-3",
        'icon-sm': 'size-(--control-small)',
        'icon-lg': 'size-(--control-height)',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

function Button({
  className,
  variant = 'default',
  size = 'default',
  asChild = false,
  type,
  loading = false,
  disabled,
  title,
  children,
  ...props
}: React.ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> &
  ({ asChild: true; loading?: never } | { asChild?: false; loading?: boolean })) {
  const Comp = asChild ? Slot : 'button';

  const control = (
    <Comp
      type={asChild ? type : (type ?? 'button')}
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
      disabled={disabled || loading}
      aria-busy={loading || props['aria-busy']}
    >
      {asChild ? (
        children
      ) : (
        <>
          <span
            className={cn(
              'inline-flex min-w-0 items-center justify-center gap-[inherit]',
              loading && 'opacity-0',
            )}
          >
            {children}
          </span>
          {loading && <LoaderCircle aria-hidden="true" className="absolute size-4 animate-spin" />}
        </>
      )}
    </Comp>
  );
  const hint = title ?? (size?.startsWith('icon') ? props['aria-label'] : undefined);
  return hint ? <Hint label={hint}>{control}</Hint> : control;
}

export { Button, buttonVariants };
