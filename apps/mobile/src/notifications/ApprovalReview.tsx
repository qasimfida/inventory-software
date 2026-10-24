import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { View } from 'react-native';
import { operationKey } from '../platform/operation-key';
import { createApprovalReviewClient, ResourceModel } from '@inventory/api-client';
import { authClient } from '../auth/client';
import { Action, Field, styles } from '../ui/Controls';
import { Text } from '../ui/Themed';
export function ApprovalReview({
  businessId,
  item,
  onDone,
}: {
  businessId: string;
  item: { id: string; kind: 'purchase' | 'transfer' | 'count' };
  onDone: () => void;
}) {
  const client = useMemo(
    () => createApprovalReviewClient(authClient.organizationRequest, operationKey, businessId),
    [businessId],
  );
  const model = useMemo(
    () => new ResourceModel(() => client.load(item.kind, item.id)),
    [client, item.kind, item.id],
  );
  const state = useSyncExternalStore(model.subscribe, model.snapshot, model.snapshot),
    [reason, setReason] = useState('');
  useEffect(() => {
    void model.run();
    return model.reset;
  }, [model]);
  return (
    <View style={styles.group}>
      {state.busy && <Text accessibilityLiveRegion="polite">Updating approval…</Text>}
      {!!state.error && <Text accessibilityRole="alert">{state.error}</Text>}
      <Action label="Reload review" disabled={state.busy} onPress={() => void model.run()} />
      {state.data && (
        <>
          <Text accessibilityRole="header">
            {state.data.title} · {state.data.state}
          </Text>
          <Text>Document {item.id}</Text>
          {state.data.details.map((line, i) => (
            <Text key={i}>{line}</Text>
          ))}
          {state.data.approve && (
            <>
              <Field
                label="Approval reason (10–240 characters)"
                maxLength={240}
                value={reason}
                onChange={setReason}
              />
              <Text>
                Confirm after reviewing these lines. The server rechecks permission, version and
                stock. Notifications grant no authority.
              </Text>
              <Action
                label="Confirm approval"
                disabled={state.busy || reason.trim().length < 10}
                onPress={() => {
                  const approve = state.data?.approve;
                  if (approve)
                    void model.run(async () => {
                      await approve(reason);
                      onDone();
                    });
                }}
              />
            </>
          )}
        </>
      )}
    </View>
  );
}
