import { IconAction } from '../ui/IconAction';
import { OnlineNotice } from './OnlineNotice';
import { ConfirmAction } from '../ui/ConfirmAction';
import { useEffect, useMemo, useSyncExternalStore } from 'react';
import { Alert, View } from 'react-native';
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
import { authClient } from '../auth/client';
import { operationKey } from '../platform/operation-key';
import { useCatalogLive } from '../platform/useCatalogLive';
import { useWorkspace } from '../shell/WorkspaceContext';
import { useNavigation } from '../shell/Navigation';
import { SettingSwitch } from '../ui/SettingSwitch';
import { Action } from '../ui/Controls';
import { Text } from '../ui/Themed';
import { ErrorState, LoadingState } from '../ui/AsyncState';
import { useTheme } from '../theme';
import { OnlineSettingsFields } from './OnlineSettingsFields';
import { OnlineImageSources } from './OnlineImageSources';
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
        operationKey,
      ),
    [business.id, storeId],
  );
  const state = useSyncExternalStore(model.subscribe, model.snapshot),
    { navigate, setLeaveGuard } = useNavigation(),
    { setLocked } = useWorkspace(),
    theme = useTheme();
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
  useEffect(() => {
    setLeaveGuard(
      state.dirty
        ? (proceed, next) => {
            if (
              next?.startsWith('/online-store/settings') &&
              path.startsWith('/online-store/settings')
            ) {
              proceed();
              return;
            }
            Alert.alert(
              'Discard unsaved settings?',
              'Your unsaved changes will be lost if you leave this page.',
              [
                { text: 'Keep editing', style: 'cancel' },
                {
                  text: 'Discard and leave',
                  style: 'destructive',
                  onPress: () => {
                    model.cancel();
                    proceed();
                  },
                },
              ],
            );
          }
        : null,
    );
    return () => setLeaveGuard(null);
  }, [state.dirty, setLeaveGuard, model, path]);
  const draft = state.draft,
    editable = hasPermission(business, 'onlineStore.manage'),
    disabled = !editable || state.busy || state.unavailable;
  const section = onlineSettingsSections.find((s) => path.endsWith('/' + s)) ?? 'general',
    settings = path.startsWith('/online-store/settings');
  if (!draft)
    return state.error ? (
      <ErrorState message={state.error} onRetry={() => void model.refresh(true)} />
    ) : (
      <LoadingState message="Loading online store settings…" />
    );
  const checks = setupChecklist(draft, state.prerequisites),
    missing = checks.filter((c) => !c.done).map((c) => c.label);
  return (
    <View style={{ gap: theme.spacing.medium }}>
      <Text accessibilityRole="header">
        {settings ? 'Online store settings' : 'Set up your online store'}
      </Text>
      <Text>
        {draft.name} · {state.saved?.enabled ? 'Live' : state.saved ? 'Not live' : 'Not configured'}
      </Text>
      <IconAction
        icon="↻"
        label="Refresh settings"
        disabled={state.busy}
        onPress={() => void model.refresh()}
      />
      {!!state.error && <ErrorState message={state.error} onRetry={() => void model.refresh()} />}
      {!!state.error && state.dirty && (
        <ConfirmAction
          label="Reload latest settings"
          description="This replaces your draft with the current server settings."
          confirmLabel="Reload latest"
          disabled={state.busy}
          onConfirm={() => void model.refresh(true)}
        />
      )}
      {!!state.message && <OnlineNotice key={state.message} message={state.message} />}
      {!editable && (
        <Text>
          Read-only access. An owner or authorized administrator can change these settings.
        </Text>
      )}
      {!!state.asOf && (
        <Text tone="muted">
          {state.busy
            ? 'Checking server…'
            : state.unavailable
              ? 'Offline or unable to verify access. Last loaded settings are read-only.'
              : 'Updated just now'}{' '}
          · As of {new Date(state.asOf).toLocaleTimeString()}
        </Text>
      )}
      <SettingSwitch
        label="Enable online store"
        value={!!state.saved?.enabled}
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
        onChange={(value) =>
          Alert.alert(
            value ? 'Enable online store?' : 'Disable online store?',
            value ? enableStoreMessage : disableStoreMessage,
            [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Confirm',
                onPress: () => {
                  if (state.saved)
                    void model.execute({
                      action: value ? 'enable' : 'disable',
                      version: state.saved.version,
                    });
                },
              },
            ],
          )
        }
      />
      {!settings ? (
        <>
          <Text accessibilityRole="header">Setup checklist</Text>
          {checks.map((c) => (
            <View key={c.label}>
              <Text>
                {c.done ? '✓ Complete' : '○ Incomplete'} — {c.label}
              </Text>
              {c.path === '/settings/company' && !hasPermission(business, 'business.write') ? (
                <Text>Ask a business administrator to review</Text>
              ) : (
                <Action
                  variant="outline"
                  label={`Review ${c.label.toLowerCase()}`}
                  onPress={() => navigate(c.path)}
                />
              )}
            </View>
          ))}
          <Action
            label="Configure store"
            onPress={() => navigate('/online-store/settings/general')}
          />
        </>
      ) : (
        <>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.small }}>
            {onlineSettingsSections.map((s) => (
              <Action
                key={s}
                variant={section === s ? 'secondary' : 'outline'}
                label={onlineSectionLabels[s]}
                onPress={() => navigate('/online-store/settings/' + s)}
              />
            ))}
          </View>
          <Text accessibilityRole="header">{onlineSectionLabels[section]}</Text>
          {section === 'images' ? (
            <OnlineImageSources
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
            <>
              <Text accessibilityLiveRegion="polite">URL slug: {slug.message}</Text>
              {slug.suggestions.map((value) => (
                <Action
                  key={value}
                  variant="outline"
                  label={`Use ${value}`}
                  disabled={disabled}
                  onPress={() => model.edit({ ...draft, slug: value })}
                />
              ))}
            </>
          )}
          <Action
            label={state.busy ? 'Saving…' : 'Save settings'}
            disabled={disabled || !slug.available || (!state.dirty && !!state.saved)}
            onPress={() => void model.save()}
          />
          <Action
            label="Cancel changes"
            variant="outline"
            disabled={state.busy || !state.dirty}
            onPress={model.cancel}
          />
        </>
      )}
    </View>
  );
}
