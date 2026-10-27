import { ManageProduct } from '../catalog/ManageProduct';
import { SidePanel } from '../ui/SidePanel';
import { OnlineListingHistory } from './OnlineListingHistory';
import { OnlineProductImage } from './OnlineProductImage';
import { onlineStatus, onlinePrice, onlineFieldLabel } from '@inventory/api-client';
import { onlineError } from '@inventory/api-client';
import { useWorkspace } from '../shell/WorkspaceContext';
import { useOnlineAvailability } from './useOnlineAvailability';
import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { Alert } from 'react-native';
import { hasPermission, onlineOverridesSchema } from '@inventory/contracts';
import type { Business, OnlineOverrides, OnlineProductDetail } from '@inventory/contracts';
import { createOnlineStoreClient, OnlineProductsModel } from '@inventory/api-client';
import { authClient } from '../auth/client';
import { Action } from '../ui/Controls';
import { Text } from '../ui/Themed';
import { ErrorState, LoadingState } from '../ui/AsyncState';
import { useNavigation } from '../shell/Navigation';
import { OnlineDetailsForm } from './OnlineDetailsForm';
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
  const { navigate } = useNavigation();
  const [editing, setEditing] = useState(false),
    [fix, setFix] = useState<string | null>(null),
    [history, setHistory] = useState(false),
    [notice, setNotice] = useState('');
  const client = useMemo(
    () => createOnlineStoreClient(authClient.organizationRequest, business.id, storeId),
    [business.id, storeId],
  );
  const model = useMemo(() => new OnlineProductsModel(client, () => crypto.randomUUID()), [client]),
    state = useSyncExternalStore(model.subscribe, model.snapshot);
  const [detail, setDetail] = useState<OnlineProductDetail | null>(null),
    [draft, setDraft] = useState<OnlineOverrides | null>(null),
    [error, setError] = useState(''),
    [retry, setRetry] = useState(0);
  const { setLeaveGuard } = useNavigation();
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
    setLeaveGuard(
      dirty
        ? (proceed) =>
            Alert.alert('Discard unsaved changes?', 'Your online draft has not been saved.', [
              { text: 'Keep editing', style: 'cancel' },
              { text: 'Discard', style: 'destructive', onPress: proceed },
            ])
        : null,
    );
    return () => setLeaveGuard(null);
  }, [dirty, setLeaveGuard]);
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
    !availability.available || state.busy || !hasPermission(business, 'onlineStore.manage');
  function reload() {
    if (dirty)
      Alert.alert('Discard and reload?', 'Load the latest server version.', [
        { text: 'Keep editing', style: 'cancel' },
        { text: 'Reload', onPress: () => setRetry(retry + 1) },
      ]);
    else setRetry(retry + 1);
  }
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
      navigate('/online-store/settings/images');
      return;
    }
    if (field === 'stockSources') {
      navigate('/online-store/settings/general');
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
    <SidePanel title="Online product details" open wide bottom onClose={onClose}>
      <Action
        label="Back to online products"
        variant="ghost"
        disabled={state.busy}
        onPress={onClose}
      />
      {(error || state.error) && <ErrorState message={error || state.error} onRetry={reload} />}
      {!detail || !draft ? (
        !error && <LoadingState message="Loading online details…" />
      ) : (
        <>
          <OnlineProductImage
            client={client}
            title={detail.listing.title}
            {...(detail.preview.source.images[0] ? { url: detail.preview.source.images[0] } : {})}
          />
          <Text accessibilityRole="header">{detail.listing.title}</Text>
          <Text>
            {onlineStatus(detail.listing, detail.preview)} · {onlinePrice(detail.preview)}
          </Text>
          {(['error', 'warning'] as const).map((severity) => (
            <Text key={severity}>
              {severity === 'error' ? 'Needs fixing' : 'Warnings'}:{' '}
              {detail.listing.issues
                .filter((i) => i.severity === severity)
                .map((i) => i.message)
                .join(' · ') || 'None'}
            </Text>
          ))}
          {hasPermission(business, 'onlineStore.manage') &&
            detail.listing.issues.map((i, n) => (
              <Action
                key={i.code + n}
                label={`Fix ${onlineFieldLabel(i.field)}`}
                disabled={
                  disabled ||
                  !hasPermission(business, 'products.write') ||
                  detail.preview.source.state === 'archived'
                }
                onPress={() =>
                  openFix(i.code === 'IMAGE_HOST_NOT_ALLOWED' ? 'allowedImageHosts' : i.field)
                }
              />
            ))}
          <Action
            label="Edit product"
            disabled={
              disabled ||
              !hasPermission(business, 'products.write') ||
              detail.preview.source.state === 'archived'
            }
            onPress={() => setFix('title')}
          />
          {!hasPermission(business, 'products.write') && (
            <Text>Catalog edit permission is required.</Text>
          )}
          {detail.preview.source.state === 'archived' && (
            <Text>
              Archived products cannot be reactivated under the catalog's irreversible archival
              policy. Remove this listing and select an active replacement.
            </Text>
          )}
          <Action label="View history" onPress={() => setHistory(true)} />
          {hasPermission(business, 'onlineStore.manage') && (
            <>
              <Action
                label="Edit online details"
                disabled={disabled}
                onPress={() => setEditing(true)}
              />
              {detail.listing.status === 'ready' && (
                <Action
                  label="Publish"
                  disabled={disabled}
                  onPress={() => void transition('publish')}
                />
              )}
              {detail.listing.status === 'active' && (
                <Action
                  label="Pause"
                  disabled={disabled}
                  onPress={() => void transition('pause')}
                />
              )}
              {detail.listing.status === 'paused' && (
                <Action
                  label="Resume"
                  disabled={disabled}
                  onPress={() => void transition('resume')}
                />
              )}
              {detail.preview.source.state === 'inactive' &&
                hasPermission(business, 'products.write') && (
                  <Action
                    label="Reactivate product"
                    disabled={disabled}
                    onPress={() => setFix('state')}
                  />
                )}
              <Action
                label="Remove from store"
                disabled={disabled}
                onPress={() =>
                  Alert.alert('Remove from online store?', 'Catalog products and stock are kept.', [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Remove',
                      style: 'destructive',
                      onPress: () => void transition('remove'),
                    },
                  ])
                }
              />
            </>
          )}
          {!!notice && <Text accessibilityLiveRegion="polite">{notice}</Text>}
          {editing && (
            <>
              <OnlineDetailsForm
                preview={detail.preview}
                value={draft}
                onChange={setDraft}
                disabled={disabled}
                client={client}
              />
              <Action
                label="Save online details"
                disabled={disabled || !dirty}
                onPress={() => void save()}
              />
              <Action
                label="Cancel changes"
                variant="outline"
                disabled={state.busy}
                onPress={() => setDraft(detail.listing.overrides)}
              />
              <Text accessibilityLiveRegion="polite">
                {state.result ? 'Saved and confirmed by the server.' : ''}
              </Text>
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
    </SidePanel>
  );
}
