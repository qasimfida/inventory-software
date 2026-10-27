import { useState } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
/** Confirmed result only. Errors remain inline and are never auto-dismissed. */
export function OnlineNotice({ message }: { message: string }) {
  const [dismissed, setDismissed] = useState(false);
  if (!message || dismissed) return null;
  return (
    <aside role="status" className="online-result-notice">
      <span>{message}</span>
      <Button
        variant="ghost"
        size="icon"
        title="Dismiss confirmation"
        aria-label="Dismiss confirmation"
        onClick={() => setDismissed(true)}
      >
        <X aria-hidden="true" />
      </Button>
    </aside>
  );
}
