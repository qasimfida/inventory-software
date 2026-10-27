import { useNavigate } from 'react-router-dom';
import { ManageProduct } from '../catalog/ManageProduct';
import { OnlineListingSummary } from './OnlineListingSummary';
import { OnlineListingHistory } from './OnlineListingHistory';
import { onlineError } from '@inventory/api-client';
import { useWorkspace } from '@/shell/WorkspaceContext';
import { useOnlineAvailability } from './useOnlineAvailability';
import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { hasPermission, onlineOverridesSchema } from '@inventory/contracts';
import type { Business, OnlineOverrides, OnlineProductDetail } from '@inventory/contracts';
import { createOnlineStoreClient, OnlineProductsModel } from '@inventory/api-client';
import { authClient } from '@/platform/auth-client';
import { FormSheet } from '@/components/common/FormSheet';
import { Button } from '@/components/ui/Button';
import { ErrorState, LoadingState } from '@/components/common/AsyncState';
import { OnlineDetailsForm } from './OnlineDetailsForm';
import { OnlineStoreGuard } from './OnlineStoreGuard';
import { useStorefrontOnline } from './useStorefrontOnline';
export function OnlineProductDetails({
  business,
  storeId,
  id,
  onClose,
}: {
  business: Business;
  storeId: string;
  id: string;
  onClose: () => void;
}) {
  const { setLocked, state: workspace } = useWorkspace();
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false),
    [fix, setFix] = useState<string | null>(null),
    [history, setHistory] = useState(false),
    [remove, setRemove] = useState(false),
    [notice, setNotice] = useState('');
  const client = useMemo(
    () => createOnlineStoreClient(authClient.organizationRequest, business.id, storeId),
    [business.id, storeId],
  );
  const model = useMemo(() => new OnlineProductsModel(client, () => crypto.randomUUID()), [client]),
    state = useSyncExternalStore(model.subscribe, model.snapshot),
    online = useStorefrontOnline();
  const [detail, setDetail] = useState<OnlineProductDetail | null>(null),
    [draft, setDraft] = useState<OnlineOverrides | null>(null),
    [error, setError] = useState(''),
    [retry, setRetry] = useState(0),
    [discard, setDiscard] = useState(false);
  useEffect(() => {
    let active = true;
    void client
      .detail(id)
      .then((d) => {
        if (active) {
          setDetail(d);
          setDraft(d.listing.overrides);
          setError('');
        }
      })
      .catch((e) => {
        if (active) {
          setError(onlineError(e));
          if ([401, 403, 404].includes(e.status)) {
            setDetail(null);
            setDraft(null);
          }
        }
      });
    return () => {
      active = false;
    };
  }, [client, id, retry]);
  const dirty = !!detail && JSON.stringify(draft) !== JSON.stringify(detail.listing.overrides);
  useEffect(() => {
    setLocked(dirty || state.busy);
    return () => setLocked(false);
  }, [dirty, state.busy, setLocked]);
  const availability = useOnlineAvailability(client);
  if (availability.denied && detail) {
    setDraft(null);
    setDetail(null);
    setError('Access changed. Sign in or ask an administrator.');
  }
  const disabled =
    !availability.available ||
    !online ||
    state.busy ||
    !hasPermission(business, 'onlineStore.manage');
  async function save() {
    if (!draft || !detail) return;
    const parsed = onlineOverridesSchema.safeParse(draft);
    if (!parsed.success) {
      setError('Check the title, description, images and non-negative price format.');
      return;
    }
    const result = await model.command({
      action: 'overrides',
      id,
      version: detail.listing.version,
      overrides: parsed.data,
    });
    if (result) {
      setDetail({ ...detail, listing: { ...detail.listing, overrides: parsed.data } });
      setRetry(retry + 1);
    }
  }
  async function refreshAfterEdit() {
    setFix(null);
    try {
      const current = await client.detail(id);
      const result = await model.command({
        action: 'validate',
        all: false,
        items: [{ id, version: current.listing.version }],
      });
      if (result) {
        const fresh = await client.detail(id);
        setDetail(fresh);
        setDraft(fresh.listing.overrides);
        setNotice(
          fresh.listing.status === 'ready'
            ? 'Now ready to publish'
            : 'Product updated; readiness refreshed.',
        );
      }
    } catch (e) {
      setError(onlineError(e));
    }
  }
  async function transition(action: 'publish' | 'pause' | 'resume' | 'remove') {
    if (!detail || disabled) return;
    const result = await model.command({
      action,
      all: false,
      items: [{ id, version: detail.listing.version }],
    });
    if (result?.items.some((r) => r.ok)) {
      if (action === 'remove') onClose();
      else setRetry((v) => v + 1);
    }
  }
  function openFix(field: string) {
    if (field === 'allowedImageHosts') {
      void navigate('/online-store/settings/images');
      return;
    }
    if (field === 'stockSources') {
      void navigate('/online-store/settings/general');
      return;
    }
    if (
      (field === 'title' && detail?.listing.overrides.title !== null) ||
      (field === 'description' && detail?.listing.overrides.description !== null) ||
      (field.includes('price') && detail?.listing.overrides.price !== null) ||
      (field.startsWith('images') && detail?.listing.overrides.images !== null)
    ) {
      setEditing(true);
      return;
    }
    setFix(field);
  }
  return (
    <FormSheet
      title="Online product details"
      open
      onOpenChange={() => {
        if (!state.busy) {
          if (dirty) setDiscard(true);
          else onClose();
        }
      }}
    >
      <OnlineStoreGuard dirty={dirty} />
      {(error || state.error) && (
        <ErrorState
          message={error || state.error}
          onRetry={() => (dirty ? setDiscard(true) : setRetry(retry + 1))}
        />
      )}
      {!online && <p role="status">Offline — retained details are read-only.</p>}
      {!detail || !draft ? (
        !error && <LoadingState message="Loading online details…" />
      ) : (
        <>
          <OnlineListingSummary
            business={business}
            detail={detail}
            client={client}
            disabled={disabled || !!error}
            fix={openFix}
            edit={() => setEditing(true)}
            history={() => setHistory(true)}
            action={(a) => (a === 'remove' ? setRemove(true) : void transition(a))}
          />
          {notice && <p role="status">{notice}</p>}
          {editing && (
            <>
              <OnlineDetailsForm
                preview={detail.preview}
                value={draft}
                onChange={setDraft}
                disabled={disabled}
                client={client}
              />
              <div className="flex gap-2">
                <Button disabled={disabled || !dirty} onClick={() => void save()}>
                  Save online details
                </Button>
                <Button
                  variant="outline"
                  disabled={state.busy}
                  onClick={() => setDraft(detail.listing.overrides)}
                >
                  Cancel changes
                </Button>
              </div>
              <p role="status">{state.result ? 'Saved and confirmed by the server.' : ''}</p>
            </>
          )}
        </>
      )}
      {history && (
        <OnlineListingHistory client={client} id={id} onClose={() => setHistory(false)} />
      )}
      {fix && detail && (
        <ManageProduct
          business={business}
          locations={workspace.workspace?.locations ?? []}
          productId={detail.listing.productId}
          focusField={fix}
          onClose={() => void refreshAfterEdit()}
        />
      )}
      {remove && (
        <div role="alert">
          <p>Remove this selection? Catalog products and stock are kept.</p>
          <Button
            variant="destructive"
            disabled={disabled}
            onClick={() => {
              setRemove(false);
              void transition('remove');
            }}
          >
            Confirm removal
          </Button>
          <Button variant="ghost" onClick={() => setRemove(false)}>
            Cancel
          </Button>
        </div>
      )}
      {discard && (
        <div role="alert" className="border p-3">
          <p>Discard unsaved changes?</p>
          <Button
            onClick={() => {
              setDiscard(false);
              setDraft(detail?.listing.overrides ?? null);
              setRetry(retry + 1);
            }}
          >
            Discard and reload
          </Button>
          <Button variant="ghost" onClick={() => setDiscard(false)}>
            Keep editing
          </Button>
        </div>
      )}
    </FormSheet>
  );
}
