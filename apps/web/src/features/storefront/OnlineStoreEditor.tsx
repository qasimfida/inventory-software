import { IconButton } from '@/components/common/IconButton';
import { RefreshCw } from 'lucide-react';
import { OnlineNotice } from './OnlineNotice';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  createOnlineStoreClient,
  OnlineStoreModel,
  onlineSettingsSections,
  onlineSectionLabels,
  setupChecklist,
  enableStoreMessage,
  disableStoreMessage,
} from '@inventory/api-client';
import { hasPermission } from '@inventory/contracts';
import type { Business, Location } from '@inventory/contracts';
import { authClient } from '@/platform/auth-client';
import { useCatalogLive } from '@/platform/useCatalogLive';
import { useWorkspace } from '@/shell/WorkspaceContext';
import { Button } from '@/components/ui/Button';
import { Switch } from '@/components/ui/Switch';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/Dialog';
import { ErrorState, LoadingState } from '@/components/common/AsyncState';
import { OnlineSettingsFields } from './OnlineSettingsFields';
import { OnlineImageSources } from './OnlineImageSources';
import { OnlineStoreGuard } from './OnlineStoreGuard';
import { useStorefrontOnline } from './useStorefrontOnline';
import { useOnlineSlug } from './useOnlineSlug';
export function OnlineStoreEditor({
  business,
  storeId,
  locations,
  path,
}: {
  business: Business;
  storeId: string;
  locations: Location[];
  path: string;
}) {
  const model = useMemo(
    () =>
      new OnlineStoreModel(
        createOnlineStoreClient(authClient.organizationRequest, business.id, storeId),
        business.id,
        storeId,
        () => crypto.randomUUID(),
      ),
    [business.id, storeId],
  );
  const state = useSyncExternalStore(model.subscribe, model.snapshot),
    online = useStorefrontOnline(),
    navigate = useNavigate(),
    { setLocked } = useWorkspace();
  const [confirm, setConfirm] = useState<'enable' | 'disable' | null>(null);
  const slug = useOnlineSlug(model, state.draft?.slug ?? '', state.asOf);
  useCatalogLive(business.id, () => void model.refresh());
  useEffect(() => {
    void model.refresh();
    const timer = setInterval(() => void model.refresh(), 15000);
    return () => {
      clearInterval(timer);
      model.reset();
    };
  }, [model]);
  useEffect(() => {
    setLocked(state.dirty || state.busy);
    return () => setLocked(false);
  }, [state.dirty, state.busy, setLocked]);
  const draft = state.draft,
    editable = hasPermission(business, 'onlineStore.manage'),
    disabled = !online || !editable || state.busy || state.unavailable;
  const section = onlineSettingsSections.find((s) => path.endsWith('/' + s)) ?? 'general';
  const settings = path.startsWith('/online-store/settings');
  if (!draft)
    return state.error ? (
      <ErrorState message={state.error} onRetry={() => void model.refresh(true)} />
    ) : (
      <LoadingState message="Loading online store settings…" />
    );
  const checks = setupChecklist(draft, state.prerequisites);
  const missing = checks.filter((c) => !c.done).map((c) => c.label);
  return (
    <section
      className="screen-section collection-surface space-y-5"
      aria-label="Online store setup"
    >
      <OnlineStoreGuard dirty={state.dirty} />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2>{settings ? 'Online store settings' : 'Set up your online store'}</h2>
          <p className="text-muted-foreground">
            {draft.name} ·{' '}
            {state.saved?.enabled ? 'Live' : state.saved ? 'Not live' : 'Not configured'}
          </p>
        </div>
        <IconButton
          label="Refresh settings"
          icon={RefreshCw}
          disabled={state.busy}
          onClick={() => void model.refresh()}
        />
      </div>
      {state.error && <ErrorState message={state.error} onRetry={() => void model.refresh()} />}
      {state.error && state.dirty && (
        <ConfirmDialog
          trigger={
            <Button variant="outline" disabled={state.busy}>
              Reload latest settings
            </Button>
          }
          title="Discard changes and reload?"
          description="This replaces your draft with the current server settings."
          confirmLabel="Reload latest"
          onConfirm={() => void model.refresh(true)}
        />
      )}
      {state.message && <OnlineNotice key={state.message} message={state.message} />}
      {!online && <p role="status">Offline. Last loaded settings are read-only.</p>}
      {!editable && (
        <p>Read-only access. An owner or authorized administrator can change these settings.</p>
      )}
      {state.asOf && (
        <p className="text-sm text-muted-foreground">
          {state.busy
            ? 'Checking server…'
            : state.error || !online
              ? 'Last loaded'
              : 'Updated just now'}{' '}
          · As of {new Date(state.asOf).toLocaleTimeString()}
        </p>
      )}
      <Switch
        label="Enable online store"
        checked={!!state.saved?.enabled}
        disabled={
          disabled ||
          state.dirty ||
          !state.saved ||
          (!state.saved.enabled && (missing.length > 0 || state.prerequisites.length > 0))
        }
        description={
          state.dirty || !state.saved
            ? 'Save settings before enabling.'
            : missing.length
              ? `Complete: ${missing.join(', ')}.`
              : state.prerequisites.join(' ') ||
                'Publishing products is a separate authorized action.'
        }
        onCheckedChange={(value) => setConfirm(value ? 'enable' : 'disable')}
      />
      {!settings ? (
        <>
          <h3>Setup checklist</h3>
          <ul className="space-y-3">
            {checks.map((c) => (
              <li key={c.label} className="flex flex-wrap items-center justify-between gap-2">
                <span>
                  {c.done ? '✓ Complete' : '○ Incomplete'} — {c.label}
                </span>
                {c.path === '/settings/company' && !hasPermission(business, 'business.write') ? (
                  <span className="text-muted-foreground">
                    Ask a business administrator to review
                  </span>
                ) : (
                  <Link className="text-primary underline" to={c.path}>
                    Review {c.label.toLowerCase()}
                  </Link>
                )}
              </li>
            ))}
          </ul>
          <Button onClick={() => void navigate('/online-store/settings/general')}>
            Configure store
          </Button>
        </>
      ) : (
        <>
          <nav aria-label="Online store settings sections" className="flex flex-wrap gap-2">
            {onlineSettingsSections.map((s) => (
              <Button
                key={s}
                variant={section === s ? 'secondary' : 'ghost'}
                aria-current={section === s ? 'page' : undefined}
                onClick={() => void navigate('/online-store/settings/' + s)}
              >
                {onlineSectionLabels[s]}
              </Button>
            ))}
          </nav>
          <h3>{onlineSectionLabels[section]}</h3>
          {section === 'images' ? (
            <OnlineImageSources
              key={storeId}
              model={model}
              draft={draft}
              disabled={disabled}
              dirty={state.dirty}
            />
          ) : (
            <OnlineSettingsFields
              draft={draft}
              section={section}
              locations={locations}
              disabled={disabled}
              edit={model.edit}
            />
          )}
          {section === 'general' && (
            <div role="status">
              <p>URL slug: {slug.message}</p>
              {slug.suggestions.map((value) => (
                <Button
                  key={value}
                  variant="link"
                  disabled={disabled}
                  onClick={() => model.edit({ ...draft, slug: value })}
                >
                  Use {value}
                </Button>
              ))}
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            <Button
              disabled={disabled || !slug.available || (!state.dirty && !!state.saved)}
              onClick={() => void model.save()}
            >
              {state.busy ? 'Saving…' : 'Save settings'}
            </Button>
            <Button variant="outline" disabled={state.busy || !state.dirty} onClick={model.cancel}>
              Cancel changes
            </Button>
          </div>
        </>
      )}
      <Dialog
        open={!!confirm}
        onOpenChange={(open) => {
          if (!open) setConfirm(null);
        }}
      >
        <DialogContent size="compact">
          <DialogTitle>
            {confirm === 'enable' ? 'Enable online store?' : 'Disable online store?'}
          </DialogTitle>
          <DialogDescription>
            {confirm === 'enable' ? enableStoreMessage : disableStoreMessage}
          </DialogDescription>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setConfirm(null)}>
              Cancel
            </Button>
            <Button
              disabled={disabled}
              onClick={() => {
                if (confirm && state.saved)
                  void model.execute({ action: confirm, version: state.saved.version });
                setConfirm(null);
              }}
            >
              Confirm {confirm}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}
