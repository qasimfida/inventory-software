import * as Primitive from '@radix-ui/react-accordion';
import type { ComponentProps, ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
export const Accordion = Primitive.Root;
export const AccordionItem = Primitive.Item;
export function AccordionTrigger({
  className,
  children,
  ...props
}: ComponentProps<typeof Primitive.Trigger>) {
  return (
    <Primitive.Header>
      <Primitive.Trigger className={cn('accordion-trigger', className)} {...props}>
        <span>{children}</span>
        <ChevronDown aria-hidden="true" />
      </Primitive.Trigger>
    </Primitive.Header>
  );
}
export function AccordionContent({
  className,
  ...props
}: ComponentProps<typeof Primitive.Content>) {
  return <Primitive.Content forceMount className={cn('accordion-content', className)} {...props} />;
}
export function AccordionSection({
  title,
  children,
  open,
  onOpenChange,
  defaultOpen = false,
  className,
  id,
}: {
  title: ReactNode;
  children: ReactNode;
  open?: boolean | undefined;
  onOpenChange?: ((open: boolean) => void) | undefined;
  defaultOpen?: boolean | undefined;
  className?: string | undefined;
  id?: string | undefined;
}) {
  return (
    <Accordion
      type="single"
      collapsible
      value={open === undefined ? undefined : open ? 'section' : ''}
      defaultValue={defaultOpen ? 'section' : ''}
      onValueChange={(v) => onOpenChange?.(!!v)}
      className={className}
      id={id}
    >
      <AccordionItem value="section">
        <AccordionTrigger>{title}</AccordionTrigger>
        <AccordionContent>{children}</AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
