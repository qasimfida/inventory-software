import { useId, useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { createApprovalReviewClient, ResourceModel } from '@inventory/api-client';
import { authClient } from '@/platform/auth-client';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/FormControls';
const key = () => crypto.randomUUID();
export function ApprovalReview({
  businessId,
  item,
  onDone,
}: {
  businessId: string;
  item: { id: string; kind: 'purchase' | 'transfer' | 'count' };
  onDone: () => void;
}) {
  const fieldId = useId();
  const client = useMemo(
    () => createApprovalReviewClient(authClient.organizationRequest, key, businessId),
    [businessId],
  );
  const model = useMemo(
    () => new ResourceModel(() => client.load(item.kind, item.id)),
    [client, item.kind, item.id],
  );
  const state = useSyncExternalStore(model.subscribe, model.snapshot),
    [reason, setReason] = useState('');
  useEffect(() => {
    void model.run();
    return model.reset;
  }, [model]);
  return (
    <section aria-label="Approval review" className="space-y-3 rounded-md border p-4">
      {state.busy && <p role="status">Updating approval…</p>}
      {state.error && <p role="alert">{state.error}</p>}
      <Button disabled={state.busy} onClick={() => void model.run()}>
        Reload review
      </Button>
      {state.data && (
        <>
          <h3>
            {state.data.title} · {state.data.state}
          </h3>
          <p className="break-all">Document {item.id}</p>
          <ul className="space-y-2">
            {state.data.details.map((line, i) => (
              <li key={i} className="break-all">
                {line}
              </li>
            ))}
          </ul>
          {state.data.approve && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const approve = state.data?.approve;
                if (approve)
                  void model.run(async () => {
                    await approve(reason);
                    onDone();
                  });
              }}
            >
              <label htmlFor={fieldId}>
                Approval reason (10–240 characters)
                <Input
                  id={fieldId}
                  required
                  minLength={10}
                  maxLength={240}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
              </label>
              <p>
                Confirm only after reviewing these lines. The server rechecks permission, version
                and stock; a notification grants no authority.
              </p>
              <Button type="submit" disabled={state.busy}>
                Confirm approval
              </Button>
            </form>
          )}
        </>
      )}
    </section>
  );
}
