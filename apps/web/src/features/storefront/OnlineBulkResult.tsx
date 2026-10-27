import { StatusBadge } from '@/components/ui/StatusBadge';
import {
  onlineResultMessage,
  onlineResultTone,
  canReviewOnlineResult,
} from '@inventory/api-client';
import type { OnlineClient } from '@inventory/api-client';
import { CheckCircle2, AlertTriangle, CircleX } from 'lucide-react';
import { FormSheet } from '@/components/common/FormSheet';
import { Button } from '@/components/ui/Button';
const groups = [
  { tone: 'success', label: 'Successful products', Icon: CheckCircle2 },
  { tone: 'warning', label: 'Products with warnings', Icon: AlertTriangle },
  { tone: 'error', label: 'Failed products', Icon: CircleX },
] as const;
export function OnlineBulkResult({
  result,
  onClose,
  onOpen,
  onTab,
}: {
  result: Awaited<ReturnType<OnlineClient['command']>>;
  onClose: () => void;
  onOpen: (id: string) => void;
  onTab: (tab: 'ready' | 'changes-required') => void;
}) {
  return (
    <FormSheet
      title="Product results"
      description="Your request has been processed. Review any products that need attention."
      open
      onOpenChange={onClose}
    >
      <div className="space-y-5" role="status">
        {groups.map(({ tone, label, Icon }) => {
          const items = result.items.filter((i) => onlineResultTone(i) === tone);
          return (
            <section key={tone} className="space-y-2">
              <h3 className="flex items-center gap-2">
                <Icon
                  className={
                    tone === 'error'
                      ? 'text-destructive'
                      : tone === 'warning'
                        ? 'text-warning'
                        : 'text-success'
                  }
                  aria-hidden="true"
                />
                {label} <StatusBadge>{items.length}</StatusBadge>
              </h3>
              {!!items.length && (
                <ul className="space-y-3">
                  {items.map((r, index) => (
                    <li key={r.id + index} className="space-y-1">
                      <p>{onlineResultMessage(r.code)}</p>
                      {canReviewOnlineResult(r.code) && (
                        <Button variant="link" onClick={() => onOpen(r.id)}>
                          {tone === 'warning'
                            ? 'Review product issues'
                            : tone === 'error'
                              ? 'Review product status'
                              : 'View product'}
                        </Button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          );
        })}
      </div>
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => onTab('changes-required')}>Review changes required</Button>
        <Button variant="outline" onClick={() => onTab('ready')}>
          View ready products
        </Button>
      </div>
    </FormSheet>
  );
}
