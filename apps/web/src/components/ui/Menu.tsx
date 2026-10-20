import * as Primitive from '@radix-ui/react-dropdown-menu';
import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils';

// Action menus are non-modal: surrounding controls stay accessible and Tab dismisses the menu.
export function Menu(props: ComponentProps<typeof Primitive.Root>) {
  return <Primitive.Root modal={false} {...props} />;
}
export const MenuTrigger = Primitive.Trigger;

export function MenuContent({ className, ...props }: ComponentProps<typeof Primitive.Content>) {
  return (
    <Primitive.Content
      sideOffset={6}
      className={cn(
        'z-50 min-w-48 max-w-[calc(100vw-2rem)] rounded-lg border bg-card p-1.5 shadow-lg',
        className,
      )}
      {...props}
    />
  );
}

export function MenuItem({ className, ...props }: ComponentProps<typeof Primitive.Item>) {
  return (
    <Primitive.Item
      className={cn(
        'flex min-h-11 cursor-pointer items-center rounded-sm px-3 py-2 text-sm outline-none data-highlighted:ring-2 data-highlighted:ring-inset data-highlighted:ring-ring data-highlighted:bg-accent data-highlighted:text-accent-foreground data-disabled:pointer-events-none data-disabled:opacity-50',
        className,
      )}
      {...props}
    />
  );
}
