import type { ComponentProps } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/Button';
export function IconButton({
  label,
  icon: Icon,
  ...props
}: Omit<ComponentProps<typeof Button>, 'children' | 'aria-label' | 'size' | 'asChild'> & {
  label: string;
  icon: LucideIcon;
}) {
  return (
    <Button variant="ghost" {...props} size="icon" aria-label={label} title={label}>
      <Icon aria-hidden="true" className="size-(--icon-size)" />
    </Button>
  );
}
