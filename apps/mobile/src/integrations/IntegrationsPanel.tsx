import { IconAction } from '../ui/IconAction';
import { LoadingState } from '../ui/AsyncState';
import { ScreenBody } from '../ui/ScreenHeader';
import { DisclosureTrigger } from '../ui/DisclosureTrigger';
import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { createIntegrationsClient, ResourceModel } from '@inventory/api-client';
import type { Business } from '@inventory/contracts';
import { Text } from '../ui/Themed';
import { Action, Field } from '../ui/Controls';
import { authClient } from '../auth/client';
export function IntegrationsPanel({
  business,
  page = false,
}: {
  business: Business;
  page?: boolean;
}) {
  const [question, setQuestion] = useState(''),
    [answer, setAnswer] = useState('');
  const [open, setOpen] = useState(page);
  const client = useMemo(
    () => createIntegrationsClient(authClient.organizationRequest, business.id),
    [business.id],
  );
  const model = useMemo(() => new ResourceModel(client.load), [client]);
  const state = useSyncExternalStore(model.subscribe, model.snapshot, model.snapshot);
  useEffect(() => {
    if (open) void model.run();
    return model.reset;
  }, [model, open]);
  return (
    <ScreenBody>
      <DisclosureTrigger
        expanded={open}
        label="Integrations and navigation help"
        onPress={() => setOpen(!open)}
        disabled={false}
      />
      {open && (
        <>
          <Text>
            Core workflows remain available without external providers. Configuration is managed by
            the deployment operator.
          </Text>
          {state.busy && <LoadingState message="Loading…" />}
          {Boolean(state.error) && <Text accessibilityRole="alert">{state.error}</Text>}
          <IconAction
            label="Refresh integration status"
            onPress={() => void model.run()}
            disabled={state.busy}
            icon="↻"
          />
          {state.data && (
            <>
              {state.data.services.map((service) => (
                <Text key={service.id}>
                  {service.id}: {service.state} — {service.detail}
                </Text>
              ))}
              <Text>Available sections for your permissions:</Text>
              {state.data.navigation.map((label) => (
                <Text key={label}>{label}</Text>
              ))}
              {state.data.services.some((s) => s.id === 'ai' && s.state === 'enabled') && (
                <>
                  <Text>
                    Ask only about navigation. Do not enter credentials, private customer
                    information or transaction details. The assistant cannot perform actions.
                  </Text>
                  <Field
                    label="Navigation question"
                    value={question}
                    onChange={setQuestion}
                    maxLength={2000}
                  />
                  <Action
                    label="Ask navigation assistant"
                    onPress={() => {
                      setAnswer('');
                      void model.run(async () => {
                        const result = await client.help(question);
                        setAnswer(result.explanation);
                      });
                    }}
                    disabled={state.busy || !question.trim()}
                  />
                </>
              )}
            </>
          )}
          {!!answer && <Text>{answer}</Text>}
        </>
      )}
    </ScreenBody>
  );
}
