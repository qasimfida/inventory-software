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
    <Primitive.Portal>
      <div role="region" aria-label={props['aria-label'] ?? 'Actions'}>
        <Primitive.Content
          sideOffset={6}
          className={cn(
            'z-50 min-w-[min(max(12rem,var(--radix-dropdown-menu-trigger-width)),calc(100vw-2rem))] max-h-(--radix-dropdown-menu-content-available-height) overflow-y-auto max-w-[calc(100vw-2rem)] rounded-lg border bg-card p-1.5 shadow-lg',
            className,
          )}
          {...props}
        />
      </div>
    </Primitive.Portal>
  );
}

export function MenuItem({ className, ...props }: ComponentProps<typeof Primitive.Item>) {
  return (
    <Primitive.Item
      className={cn(
        'flex min-h-(--control-height) cursor-pointer items-center rounded-sm px-3 py-2 text-control [overflow-wrap:anywhere] outline-none data-highlighted:ring-2 data-highlighted:ring-inset data-highlighted:ring-ring data-highlighted:bg-accent data-highlighted:text-accent-foreground data-disabled:pointer-events-none data-disabled:text-disabled-foreground data-disabled:bg-disabled',
        className,
      )}
      {...props}
    />
  );
}

export function MenuSeparator(props: ComponentProps<typeof Primitive.Separator>) {
  return <Primitive.Separator {...props} className={cn('my-1 h-px bg-border', props.className)} />;
}
