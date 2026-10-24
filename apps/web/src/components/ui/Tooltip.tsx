// shadcn/ui Radix composition, adapted to the application's semantic tokens.
import { Slot } from '@radix-ui/react-slot';
import * as Primitive from '@radix-ui/react-tooltip';
import type { ComponentProps, ReactElement } from 'react';
import { cn } from '@/lib/utils';
export const TooltipProvider = Primitive.Provider;
export const Tooltip = Primitive.Root;
export const TooltipTrigger = Primitive.Trigger;
export function TooltipContent({
  className,
  sideOffset = 4,
  ...props
}: ComponentProps<typeof Primitive.Content>) {
  return (
    <Primitive.Portal>
      <Primitive.Content
        sideOffset={sideOffset}
        className={cn('ui-tooltip', className)}
        {...props}
      />
    </Primitive.Portal>
  );
}
// Tooltip state must not overwrite a nested Tabs/Menu/Popover trigger's data-state.
function TooltipTarget({
  'data-state': tooltipState,
  ...props
}: ComponentProps<typeof Slot> & { 'data-state'?: string }) {
  return <Slot data-tooltip-state={tooltipState} {...props} />;
}
/** Hover and keyboard help. The trigger must keep its own accessible name. */
export function Hint({ label, children }: { label: string; children: ReactElement }) {
  return (
    <TooltipProvider delayDuration={350}>
      <Tooltip>
        <TooltipTrigger asChild>
          <TooltipTarget>{children}</TooltipTarget>
        </TooltipTrigger>
        <TooltipContent>{label}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
