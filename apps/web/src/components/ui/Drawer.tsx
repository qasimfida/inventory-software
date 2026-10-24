// shadcn/ui Drawer composition built on Vaul; right/left directions suit operational forms.
import { Drawer as Primitive } from 'vaul';
import { useRef, useImperativeHandle, type ComponentProps } from 'react';
import { cn } from '@/lib/utils';
export function Drawer(props: ComponentProps<typeof Primitive.Root>) {
  // eslint-disable-next-line jsx-a11y/no-autofocus -- Modal focus is moved by Content to its form or labelled container and restored on close.
  return <Primitive.Root direction="right" shouldScaleBackground={false} autoFocus {...props} />;
}
export const DrawerTrigger = Primitive.Trigger;
export const DrawerClose = Primitive.Close;
export const DrawerTitle = Primitive.Title;
export const DrawerDescription = Primitive.Description;
export function DrawerContent({
  className,
  children,
  onOpenAutoFocus,
  ref: forwardedRef,
  ...props
}: ComponentProps<typeof Primitive.Content>) {
  const content = useRef<HTMLDivElement>(null);
  useImperativeHandle(forwardedRef, () => content.current!);
  return (
    <Primitive.Portal>
      <Primitive.Overlay className="drawer-overlay" />
      <Primitive.Content
        ref={content}
        className={cn('ui-drawer', className)}
        {...props}
        onOpenAutoFocus={(event) => {
          onOpenAutoFocus?.(event);
          if (event.defaultPrevented) return;
          // Focus the form or title container, not a close-button tooltip. Escape must
          // dismiss the drawer on its first press and labels remain announced.
          event.preventDefault();
          const field = content.current?.querySelector<HTMLElement>(
            'input:not([disabled]):not([type="hidden"]), textarea:not([disabled]), [role="combobox"]:not([disabled])',
          );
          (field ?? content.current)?.focus();
        }}
      >
        <Primitive.Handle className="drawer-handle" aria-label="Drag to close drawer" />
        {children}
      </Primitive.Content>
    </Primitive.Portal>
  );
}
