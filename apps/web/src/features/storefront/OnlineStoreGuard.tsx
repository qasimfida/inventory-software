import { useBeforeUnload, useBlocker } from 'react-router-dom';
import { useCallback } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
export function OnlineStoreGuard({ dirty }: { dirty: boolean }) {
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      dirty &&
      currentLocation.pathname !== nextLocation.pathname &&
      !(
        currentLocation.pathname.startsWith('/online-store/settings') &&
        nextLocation.pathname.startsWith('/online-store/settings')
      ),
  );
  useBeforeUnload(
    useCallback(
      (event) => {
        if (dirty) event.preventDefault();
      },
      [dirty],
    ),
  );
  return (
    <Dialog
      open={blocker.state === 'blocked'}
      onOpenChange={(open) => {
        if (!open && blocker.state === 'blocked') blocker.reset();
      }}
    >
      <DialogContent size="compact">
        <DialogTitle>Discard unsaved settings?</DialogTitle>
        <DialogDescription>
          Your unsaved changes will be lost if you leave this page.
        </DialogDescription>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => {
              if (blocker.state === 'blocked') blocker.reset();
            }}
          >
            Keep editing
          </Button>
          <Button
            variant="destructive"
            onClick={() => {
              if (blocker.state === 'blocked') blocker.proceed();
            }}
          >
            Discard and leave
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
