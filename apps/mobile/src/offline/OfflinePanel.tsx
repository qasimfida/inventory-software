import { OfflineCart } from './OfflineCart';
import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { View as Box, Text as Txt, TextInput, AppState } from 'react-native';
import { OfflineWorkspace } from '@inventory/api-client';
import { authClient } from '../auth/client';
import { createVaultStore } from '../platform/vault-store';
import { vaultRandom } from '../platform/vault-random';
import { randomUUID as uuid } from 'expo-crypto';
import { Action as Act, Field as F, styles } from '../organization/Controls';
import { onOfflineLock } from './offline-lock';
import { OfflinePolicy as Policy } from './OfflinePolicy';
const Secret = ({ value, onChange }: { value: string; onChange: (s: string) => void }) => (
  <>
    <Txt>Separate offline passphrase (15–128 characters)</Txt>
    <TextInput
      style={styles.input}
      accessibilityLabel="Separate offline passphrase"
      secureTextEntry
      autoCapitalize="none"
      autoCorrect={false}
      value={value}
      onChangeText={onChange}
    />
  </>
);
export function OfflinePanel() {
  const model = useMemo(
    () =>
      new OfflineWorkspace(
        async () => createVaultStore(),
        vaultRandom,
        authClient.organizationRequest,
        uuid,
      ),
    [],
  );
  const state = useSyncExternalStore(model.subscribe, model.snapshot, model.snapshot);
  const [open, setOpen] = useState(false),
    [name, setName] = useState('register'),
    [password, setPassword] = useState(''),
    [businessId, setBusiness] = useState(''),
    [warehouseId, setWarehouse] = useState(''),
    [currency, setCurrency] = useState('USD'),
    [note, setNote] = useState('');
  useEffect(() => {
    const timer = setInterval(() => void model.sync(), 15000);
    const unsubscribe = onOfflineLock(model.lock);
    const subscription = AppState.addEventListener('change', (s) => {
      if (s !== 'active') model.lock();
    });
    return () => {
      clearInterval(timer);
      unsubscribe();
      subscription.remove();
      model.lock();
    };
  }, [model]);
  const data = state.data;
  return (
    <Box>
      <Act
        label={open ? 'Close offline register' : 'Offline cash register'}
        onPress={() => {
          setOpen(!open);
          if (open) model.lock();
        }}
      />
      {open && (
        <>
          <Txt>
            Separate encrypted offline register. Cash only, root warehouse stock, no customer
            credit. Prepare online with an open shift. Keep the shift open until every offline sale
            is confirmed.
          </Txt>
          {state.error && <Txt>{state.error}</Txt>}
          {!data ? (
            <>
              <F label="Vault name" value={name} onChange={setName} />
              <Secret value={password} onChange={setPassword} />
              <Act
                label="Unlock saved register"
                disabled={state.busy}
                onPress={() => {
                  void model.open(name, password);
                  setPassword('');
                }}
              />
              <F label="Business ID for preparation" value={businessId} onChange={setBusiness} />
              <F label="Warehouse ID for preparation" value={warehouseId} onChange={setWarehouse} />
              <F label="Currency" value={currency} onChange={setCurrency} />
              <Act
                label="Prepare new offline register online"
                disabled={state.busy}
                onPress={() => {
                  void model.open(name, password, { businessId, warehouseId, currency });
                  setPassword('');
                }}
              />
              <Policy businessId={businessId} />
            </>
          ) : (
            <>
              <Act label="Lock register" onPress={model.lock} />
              <Act label="Synchronize / renew permission" onPress={() => void model.sync()} />
              <Txt>
                Permission expires {data.leases[data.activeLeaseId]!.expiresAt}. Snapshot{' '}
                {data.leases[data.activeLeaseId]!.snapshot.revision}. Pending records are retained
                after expiration. Global stock is checked on upload; another terminal can consume it
                first.
              </Txt>
              <OfflineCart model={model} data={data} />
              <Txt>
                {data.error} Last sync:{' '}
                {data.lastSync ? new Date(data.lastSync).toISOString() : 'Never'}
              </Txt>
              <F
                label="Owner reconciliation reason (minimum 10 characters)"
                value={note}
                onChange={setNote}
              />
              <Txt>
                Owner review requires available stock and an open owner cash shift. Reconcile the
                physical cash into that shift before approving.
              </Txt>
              {data.outbox.map((e) => (
                <Box key={e.operation.id}>
                  <Txt>
                    {e.operation.id} · {e.state} · {e.result?.saleId ?? ''} {e.error}
                  </Txt>
                  {e.state !== 'synced' && (
                    <>
                      <Act
                        label="Retry same operation"
                        onPress={() => void model.retry(e.operation.id)}
                      />
                      {(e.state === 'conflict' || e.state === 'rejected') && (
                        <Act
                          label="Owner: reconcile original sale online"
                          onPress={() => void model.reconcile(e.operation.id, note)}
                        />
                      )}
                    </>
                  )}
                </Box>
              ))}
            </>
          )}
        </>
      )}
    </Box>
  );
}
