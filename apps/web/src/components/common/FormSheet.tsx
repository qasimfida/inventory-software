import { useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { Drawer, DrawerContent, DrawerTitle, DrawerDescription } from '@/components/ui/Drawer';
import { Button } from '@/components/ui/Button';
/** Controlled right drawer; the export name preserves existing callers. The caller retains drafts, errors and mutation ownership. */
export function FormSheet({
  title,
  description = 'Review the details before saving.',
  open,
  onOpenChange,
  children,
}: {
  title: string;
  description?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
}) {
  const returnFocus = useRef<HTMLElement | null>(null);
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent
        className="form-drawer"
        onOpenAutoFocus={() => {
          returnFocus.current =
            document.activeElement instanceof HTMLElement ? document.activeElement : null;
        }}
        onCloseAutoFocus={(event) => {
          if (returnFocus.current?.isConnected) {
            event.preventDefault();
            returnFocus.current.focus();
          }
        }}
      >
        <div className="flex items-center justify-between gap-3">
          <DrawerTitle>{title}</DrawerTitle>
          <Button
            variant="ghost"
            size="icon"
            aria-label={`Close ${title}`}
            title="Close"
            onClick={() => onOpenChange(false)}
          >
            <X />
          </Button>
        </div>
        <DrawerDescription>{description}</DrawerDescription>
        {children}
      </DrawerContent>
    </Drawer>
  );
}
