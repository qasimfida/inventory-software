import { SyncStatus } from './SyncStatus';
import { useReachability } from '@/platform/useReachability';
import { VaultRecovery } from './VaultRecovery';
import { OfflineCart } from './OfflineCart';
import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { OfflineWorkspace } from '@inventory/api-client';
import { authClient } from '@/platform/auth-client';
import { createVaultStore, vaultRandom } from '@/platform/vault-store';
import { onOfflineLock } from './offline-lock';
import { OfflinePolicy as Policy } from './OfflinePolicy';
const uuid = () => crypto.randomUUID();
import { Box, Txt, Act, F, Secret } from '@/components/common/WorkspaceControls';
export function OfflinePanel({
  allowSetup = true,
  embedded = false,
  setup,
  onLockChange,
}: {
  allowSetup?: boolean;
  embedded?: boolean;
  setup?: { businessId: string; warehouseId: string; currency: string };
  onLockChange?: (locked: boolean) => void;
}) {
  const online = useReachability();
  const model = useMemo(
    () =>
      new OfflineWorkspace(
        async () =>
          import.meta.env.DEV && import.meta.env.VITE_USE_MOCKS === 'true'
            ? (await import('@inventory/api-client/mock')).demoVaultStore
            : createVaultStore(),
        vaultRandom,
        authClient.organizationRequest,
        uuid,
      ),
    [],
  );
  const state = useSyncExternalStore(model.subscribe, model.snapshot, model.snapshot);
  const [open, setOpen] = useState(embedded),
    [name, setName] = useState('register'),
    [password, setPassword] = useState(''),
    [businessId, setBusiness] = useState(setup?.businessId ?? ''),
    [warehouseId, setWarehouse] = useState(setup?.warehouseId ?? ''),
    [currency, setCurrency] = useState(setup?.currency ?? 'USD'),
    [note, setNote] = useState('');
  useEffect(() => {
    const timer = setInterval(() => void model.sync(), 15000);
    const unsubscribe = onOfflineLock(model.lock);
    const hidden = () => {
      if (document.hidden) model.lock();
    };
    document.addEventListener('visibilitychange', hidden);
    return () => {
      clearInterval(timer);
      unsubscribe();
      document.removeEventListener('visibilitychange', hidden);
      model.lock();
    };
  }, [model]);
  const data = state.data;
  const unlocked = Boolean(data);
  useEffect(() => {
    if (online && unlocked) void model.sync();
  }, [online, unlocked, model]);
  useEffect(() => {
    onLockChange?.(state.busy || !!data?.cart.length);
    return () => onLockChange?.(false);
  }, [onLockChange, state.busy, data?.cart.length]);
  return (
    <Box>
      {!embedded && (
        <Act
          label={open ? 'Close cached checkout' : 'Use cached products'}
          onPress={() => {
            setOpen(!open);
            if (open) model.lock();
          }}
        />
      )}
      {open && (
        <>
          <Txt>
            Encrypted cached checkout. Cash only, root warehouse stock, no customer credit. Prepare
            online with an open shift. Keep the shift open until every offline sale is confirmed.
          </Txt>
          {state.error && <Txt>{state.error}</Txt>}
          <VaultRecovery model={model} name={name} password={password} unlocked={!!data} />
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
              {allowSetup && (
                <>
                  <F
                    label="Business ID for preparation"
                    value={businessId}
                    onChange={setBusiness}
                  />
                  <F
                    label="Warehouse ID for preparation"
                    value={warehouseId}
                    onChange={setWarehouse}
                  />
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
              )}
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
              <SyncStatus state={state} />
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
