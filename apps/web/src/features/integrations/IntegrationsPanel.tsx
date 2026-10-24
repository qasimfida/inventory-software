import { RefreshCw } from 'lucide-react';
import { LoadingState } from '@/components/common/AsyncState';
import { ScreenHeader } from '@/components/common/ScreenHeader';
import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { createIntegrationsClient, ResourceModel } from '@inventory/api-client';
import type { Business } from '@inventory/contracts';
import { Button } from '@/components/ui/Button';
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
        title="Integrations and navigation help"
        description={
          <>
            Core workflows remain available without external providers. Configuration is managed by
            the deployment operator.
          </>
        }
      />
      {state.busy && <LoadingState message="Loading…" />}
      {state.error && <p role="alert">{state.error}</p>}
      <Button
        onClick={() => void model.run()}
        disabled={state.busy}
        variant="ghost"
        size="icon"
        aria-label="Refresh integration status"
        title="Refresh"
      >
        <RefreshCw aria-hidden="true" />
      </Button>
      {state.data && (
        <>
          {state.data.services.map((service) => (
            <p key={service.id}>
              {service.id}: {service.state} — {service.detail}
            </p>
          ))}
          <p>Available sections for your permissions:</p>
          {state.data.navigation.map((label) => (
            <p key={label}>{label}</p>
          ))}
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
      {!!answer && <p>{answer}</p>}
    </section>
  );
}
