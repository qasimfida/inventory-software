import { CursorPagination } from '../ui/CursorPagination';
import { IconAction } from '../ui/IconAction';
import { EmptyState } from '../ui/AsyncState';
import { ScreenHeader } from '../ui/ScreenHeader';
import { DisclosureTrigger } from '../ui/DisclosureTrigger';
import { BusinessPolicy } from '../settings/BusinessPolicy';
import { settingsModel } from '../settings/model';
import { Text } from '../ui/Themed';
import { ManagementWorkflows } from './ManagementWorkflows';
import { PosPanel } from '../pos/PosPanel';
import { AuditHistory } from './AuditHistory';
import { hasPermission } from '@inventory/contracts';
import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { View } from 'react-native';
import { createOrganizationClient, OrganizationModel } from '@inventory/api-client';
import { authClient } from '../auth/client';
import { Action, Field, styles } from './Controls';
import { BusinessEditor } from './BusinessEditor';
import { LocationEditor } from './LocationEditor';
import { MemberEditor } from './MemberEditor';
export function ManagementPanel() {
  const [businessTools, setBusinessTools] = useState(false);
  const [checkout, setCheckout] = useState(false);
  const [administration, setAdministration] = useState(false);
  const model = useMemo(
    () => new OrganizationModel(createOrganizationClient(authClient.organizationRequest)),
    [],
  );
  const state = useSyncExternalStore(model.subscribe, model.snapshot, model.snapshot);
  const [name, setName] = useState('');
  useEffect(() => {
    void model.refresh();
    const timer = setInterval(() => void model.revalidate(), 60000);
    return () => {
      clearInterval(timer);
      model.reset();
    };
  }, [model]);
  useEffect(() => {
    const accountId = settingsModel.snapshot().accountId;
    if (accountId) void settingsModel.connect(accountId, state.selectedId);
  }, [state.selectedId]);
  const selected = state.businesses.find((b) => b.id === state.selectedId);
  if (
    checkout &&
    selected &&
    state.workspace &&
    (hasPermission(selected, 'sales.write') ||
      hasPermission(selected, 'sales.read') ||
      hasPermission(selected, 'payments.read'))
  )
    return (
      <PosPanel
        key={JSON.stringify([selected, state.workspace.locations])}
        business={selected}
        locations={state.workspace.locations}
        close={() => setCheckout(false)}
      />
    );
  return (
    <View style={styles.group}>
      <ScreenHeader
        title="Business management"
        description={
          <>
            Online only. Accounts can join multiple businesses; locations and devices cannot be
            shared between businesses.
          </>
        }
      />
      {state.error ? (
        <Text accessibilityRole="alert" tone="error">
          {state.error}
        </Text>
      ) : null}
      {state.busy ? <Text accessibilityLiveRegion="polite">Updating management data…</Text> : null}
      <IconAction
        label="Refresh businesses"
        disabled={state.busy}
        onPress={() => void model.refresh()}
        icon="↻"
      />
      <DisclosureTrigger
        label="Business selection and creation"
        expanded={businessTools || !state.businesses.length}
        onPress={() => setBusinessTools(!businessTools)}
      />
      <View style={{ display: businessTools || !state.businesses.length ? 'flex' : 'none' }}>
        <Field label="New business name" value={name} onChange={setName} disabled={state.busy} />
        <Action
          label="Create business"
          disabled={state.busy}
          onPress={() =>
            void model.refresh(async () => {
              const business = await model.client.create(name);
              setName('');
              return business.id;
            })
          }
        />
        {!state.businesses.length && !state.busy ? (
          <EmptyState message="No active memberships. Create a business or ask an owner to assign your account." />
        ) : null}
        {state.businesses.map((b) => (
          <Action
            key={b.id}
            label={`${b.name} · ${b.state} · ${b.role}`}
            disabled={state.busy}
            onPress={() => void model.select(b.id)}
          />
        ))}
      </View>
      {selected && (
        <>
          <Text accessibilityRole="header">{selected.name}</Text>
          {state.workspace &&
            (hasPermission(selected, 'sales.write') ||
              hasPermission(selected, 'sales.read') ||
              hasPermission(selected, 'payments.read')) && (
              <Action label="Open point of sale" onPress={() => setCheckout(true)} />
            )}
          {state.workspace && (
            <ManagementWorkflows
              key={selected.id}
              business={selected}
              locations={state.workspace.locations}
            />
          )}
          <Action label="Business & access" onPress={() => setAdministration(!administration)} />
          <View
            style={{ display: administration ? 'flex' : 'none' }}
            accessibilityElementsHidden={!administration}
            importantForAccessibility={administration ? 'auto' : 'no-hide-descendants'}
          >
            <BusinessPolicy business={selected} />
            {hasPermission(selected, 'business.write') && (
              <BusinessEditor
                key={`${selected.id}-${selected.version}`}
                business={selected}
                model={model}
                busy={state.busy}
              />
            )}
            {selected.state !== 'active' && (
              <Text>
                This business is {selected.state}. Child access is locked. Archived records cannot
                be restored.
              </Text>
            )}
            {state.workspace && (
              <>
                <LocationEditor model={model} workspace={state.workspace} busy={state.busy} />
                {hasPermission(selected, 'users.read') && (
                  <MemberEditor model={model} workspace={state.workspace} busy={state.busy} />
                )}
              </>
            )}
            {hasPermission(selected, 'audit.read') && (
              <>
                <Action
                  label="View audit history"
                  disabled={state.busy}
                  onPress={() => void model.audit()}
                />
                <AuditHistory events={state.events} timeZone={selected.timeZone ?? 'UTC'} />
                {state.nextCursor && (
                  <CursorPagination
                    label="audit events"
                    hasMore={Boolean(state.nextCursor)}
                    busy={state.busy}
                    onNext={() => void model.audit(true)}
                  />
                )}
              </>
            )}
          </View>
        </>
      )}
    </View>
  );
}
