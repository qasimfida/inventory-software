import { WarehousePanel } from '../warehouse/WarehousePanel';
import { PosPanel } from '../pos/PosPanel';
import { CustomerPanel } from '../customers/CustomerPanel';
import { TransferPanel } from '../transfers/TransferPanel';
import { StoragePanel } from '../storage/StoragePanel';
import { PurchasingPanel } from '../purchasing/PurchasingPanel';
import { InventoryPanel } from '../inventory/InventoryPanel';
import { CatalogPanel } from '../catalog/CatalogPanel';
import { AuditHistory } from './AuditHistory';
import { hasPermission } from '@inventory/contracts';
import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { Text, View } from 'react-native';
import { createOrganizationClient, OrganizationModel } from '@inventory/api-client';
import { authClient } from '../auth/client';
import { Action, Field, styles } from './Controls';
import { BusinessEditor } from './BusinessEditor';
import { LocationEditor } from './LocationEditor';
import { MemberEditor } from './MemberEditor';
export function ManagementPanel() {
  const [checkout, setCheckout] = useState(false);
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
      <Text accessibilityRole="header" style={styles.heading}>
        Business management
      </Text>
      <Text>
        Online only. Accounts can join multiple businesses; locations and devices cannot be shared
        between businesses.
      </Text>
      {state.error ? (
        <Text accessibilityRole="alert" style={styles.error}>
          {state.error}
        </Text>
      ) : null}
      {state.busy ? <Text accessibilityLiveRegion="polite">Updating management data…</Text> : null}
      <Action
        label="Refresh businesses"
        disabled={state.busy}
        onPress={() => void model.refresh()}
      />
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
        <Text>
          No active memberships. Create a business or ask an owner to assign your account.
        </Text>
      ) : null}
      {state.businesses.map((b) => (
        <Action
          key={b.id}
          label={`${b.name} · ${b.state} · ${b.role}`}
          disabled={state.busy}
          onPress={() => void model.select(b.id)}
        />
      ))}
      {selected && (
        <>
          <Text accessibilityRole="header">{selected.name}</Text>
          {state.workspace &&
            (hasPermission(selected, 'sales.write') ||
              hasPermission(selected, 'sales.read') ||
              hasPermission(selected, 'payments.read')) && (
              <Action label="Open point of sale" onPress={() => setCheckout(true)} />
            )}
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
              This business is {selected.state}. Child access is locked. Archived records cannot be
              restored.
            </Text>
          )}
          {state.workspace && (
            <>
              {hasPermission(selected, 'customers.read') && (
                <CustomerPanel
                  key={JSON.stringify([selected, state.workspace.locations])}
                  business={selected}
                  locations={state.workspace.locations}
                />
              )}
              {hasPermission(selected, 'products.read') && (
                <CatalogPanel
                  key={JSON.stringify([selected, state.workspace.locations])}
                  business={selected}
                  locations={state.workspace.locations}
                />
              )}
              {hasPermission(selected, 'stock.read') && (
                <WarehousePanel
                  key={JSON.stringify(selected)}
                  business={selected}
                  locations={state.workspace.locations}
                />
              )}
              {hasPermission(selected, 'stock.read') && (
                <TransferPanel
                  key={JSON.stringify([selected, state.workspace.locations])}
                  business={selected}
                  locations={state.workspace.locations}
                />
              )}
              {hasPermission(selected, 'purchases.read') && (
                <PurchasingPanel
                  key={JSON.stringify([selected, state.workspace.locations])}
                  business={selected}
                  locations={state.workspace.locations}
                />
              )}
              {hasPermission(selected, 'stock.read') && (
                <StoragePanel
                  key={JSON.stringify([selected, state.workspace.locations])}
                  business={selected}
                  locations={state.workspace.locations}
                />
              )}
              {hasPermission(selected, 'stock.read') && (
                <InventoryPanel
                  key={JSON.stringify([selected, state.workspace.locations])}
                  business={selected}
                  locations={state.workspace.locations}
                />
              )}
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
                <Action
                  label="More audit events"
                  disabled={state.busy}
                  onPress={() => void model.audit(true)}
                />
              )}
            </>
          )}
        </>
      )}
    </View>
  );
}
