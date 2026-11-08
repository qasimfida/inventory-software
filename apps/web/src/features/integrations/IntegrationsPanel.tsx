import { ProviderOverview } from './ProviderOverview';
import { RefreshCw } from 'lucide-react';
import { LoadingState, ErrorState } from '@/components/common/AsyncState';
import { ScreenHeader } from '@/components/common/ScreenHeader';
import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { createIntegrationsClient, ResourceModel } from '@inventory/api-client';
import type { Business } from '@inventory/contracts';
import { Button } from '@/components/ui/Button';
import { IconButton } from '@/components/common/IconButton';
import { Input } from '@/components/ui/FormControls';
import { authClient } from '@/platform/auth-client';
export function IntegrationsPanel({ business }: { business: Business }) {
  const [question, setQuestion] = useState(''),
    [answer, setAnswer] = useState('');
  const client = useMemo(
    () => createIntegrationsClient(authClient.organizationRequest, business.id),
    [business.id],
  );
  const model = useMemo(() => new ResourceModel(client.load), [client]);
  const state = useSyncExternalStore(model.subscribe, model.snapshot, model.snapshot);
  useEffect(() => {
    void model.run();
    return model.reset;
  }, [model]);
  return (
    <section aria-label="Integrations and navigation help" className="screen-section">
      <ScreenHeader
        title="Integrations & help"
        description={
          <>
            Core workflows remain available without external providers. Configuration is managed by
            the deployment operator.
          </>
        }
      />
      {state.busy && <LoadingState message="Loading…" />}
      {state.error && <ErrorState message={state.error} onRetry={() => void model.run()} />}
      <IconButton
        label="Refresh integration status"
        icon={RefreshCw}
        onClick={() => void model.run()}
        disabled={state.busy}
      />
      {state.data && (
        <>
          <ProviderOverview data={state.data} />
          {state.data.services.some((s) => s.id === 'ai' && s.state === 'enabled') && (
            <>
              <p>
                Ask only about navigation. Do not enter credentials, private customer information or
                transaction details. The assistant cannot perform actions.
              </p>
              <label htmlFor="navigation-question">
                Navigation question
                <Input
                  id="navigation-question"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  maxLength={2000}
                />
              </label>
              <Button
                onClick={() => {
                  setAnswer('');
                  void model.run(async () => {
                    const result = await client.help(question);
                    setAnswer(result.explanation);
                  });
                }}
                disabled={state.busy || !question.trim()}
              >
                Ask navigation assistant
              </Button>
            </>
          )}
        </>
      )}
      {!!answer && (
        <section aria-label="Navigation answer" className="space-y-2" role="status">
          <h3>Navigation guidance</h3>
          <p>{answer}</p>
        </section>
      )}
    </section>
  );
}
