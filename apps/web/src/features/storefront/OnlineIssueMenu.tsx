import { useRef, useState, useEffect } from 'react';
import { AlertTriangle, CircleAlert } from 'lucide-react';
import type { ChannelListing } from '@inventory/contracts';
import { onlineFieldLabel } from '@inventory/api-client';
import { Button } from '@/components/ui/Button';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/Popover';
/** Interactive issue help: hover, focus and click work; fixes are never placed inside a tooltip. */
export function OnlineIssueMenu({
  issues,
  canFix,
  disabled,
  fix,
}: {
  issues: ChannelListing['issues'];
  canFix: boolean;
  disabled: boolean;
  fix: (field: string) => void;
}) {
  const [open, setOpen] = useState(false),
    timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );
  if (!issues.length) return null;
  const errors = issues.filter((i) => i.severity === 'error').length;
  const enter = () => {
    if (timer.current) clearTimeout(timer.current);
    setOpen(true);
  };
  const leave = () => {
    timer.current = setTimeout(() => setOpen(false), 200);
  };
  const Icon = errors ? CircleAlert : AlertTriangle;
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          size="icon"
          variant="ghost"
          aria-label={`${errors} errors, ${issues.length - errors} warnings`}
          onMouseEnter={enter}
          onMouseLeave={leave}
          onFocus={enter}
        >
          <Icon className={errors ? 'text-destructive' : 'text-warning'} aria-hidden="true" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        onMouseEnter={enter}
        onMouseLeave={leave}
        onOpenAutoFocus={(e) => e.preventDefault()}
        className="space-y-3"
        aria-label="Product issues"
      >
        <h4>Product issues</h4>
        {issues.map((i, index) => (
          <div key={i.code + index} className="space-y-1">
            <p className="flex gap-2">
              {i.severity === 'error' ? (
                <CircleAlert className="text-destructive shrink-0" aria-hidden="true" />
              ) : (
                <AlertTriangle className="text-warning shrink-0" aria-hidden="true" />
              )}
              {i.message}
            </p>
            {canFix && (
              <Button
                variant="link"
                size="sm"
                disabled={disabled || i.code === 'PRODUCT_ARCHIVED'}
                onClick={() => {
                  setOpen(false);
                  fix(i.code === 'IMAGE_HOST_NOT_ALLOWED' ? 'allowedImageHosts' : i.field);
                }}
              >
                {i.code === 'PRODUCT_ARCHIVED'
                  ? 'Archived — use a replacement'
                  : `Fix ${onlineFieldLabel(i.field)}`}
              </Button>
            )}
          </div>
        ))}
      </PopoverContent>
    </Popover>
  );
}
