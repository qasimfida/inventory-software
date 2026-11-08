import { DisclosureTrigger } from '../ui/DisclosureTrigger';
import { IndustryFields } from './IndustryFields';
import { useState, useSyncExternalStore } from 'react';
import { View } from 'react-native';
import { preferenceFields, notificationFields } from '@inventory/api-client';
import { settingsPolicySchema, isCosmeticPreference } from '@inventory/contracts';
import type { PolicyRecord, SettingsPolicy } from '@inventory/contracts';
import { settingsModel } from './model';
import { Action, Choice, choices, styles } from '../ui/Controls';
import { Text } from '../ui/Themed';
export function PolicyEditor({
  policy,
  platform = false,
}: {
  policy: PolicyRecord;
  platform?: boolean;
}) {
  const [open, setOpen] = useState(false),
    [values, setValues] = useState<SettingsPolicy>(policy.values);
  const state = useSyncExternalStore(
    settingsModel.subscribe,
    settingsModel.snapshot,
    settingsModel.snapshot,
  );
  function update(layer: 'defaults' | 'enforced' | 'notifications', key: string, value: string) {
    const next: Record<string, unknown> = { ...values[layer] };
    if (value === 'inherit') delete next[key];
    else next[key] = value === 'true' ? true : value === 'false' ? false : value;
    setValues({ ...values, [layer]: settingsPolicySchema.shape[layer].parse(next) });
  }
  return (
    <View style={styles.group}>
      <DisclosureTrigger
        expanded={open}
        label={platform ? 'Platform policy' : 'Business policy'}
        onPress={() => setOpen(!open)}
      />
      {open && (
        <>
          <Text>
            Appearance follows the account. Platform defaults fill unset choices. Old cosmetic
            enforcement is retained but no longer applied; currency and list-loading enforcement
            remain active.
          </Text>
          {(['defaults', 'enforced'] as const).map((layer) => (
            <View key={layer} style={styles.group}>
              <Text accessibilityRole="header">{layer}</Text>
              {preferenceFields
                .filter(
                  (field) => !isCosmeticPreference(field.key) || (platform && layer === 'defaults'),
                )
                .map((field) => (
                  <Choice
                    key={field.key}
                    label={`${layer}: ${field.label}`}
                    value={values[layer][field.key] ?? 'inherit'}
                    options={choices(['inherit', ...field.options])}
                    disabled={state.busy}
                    onChange={(value) => update(layer, field.key, value)}
                  />
                ))}
              {platform && layer === 'defaults' && (
                <Choice
                  label={`${layer}: Visual effects`}
                  value={String(values[layer].effects ?? 'inherit')}
                  options={choices(['inherit', 'true', 'false'])}
                  disabled={state.busy}
                  onChange={(value) => update(layer, 'effects', value)}
                />
              )}
            </View>
          ))}
          {notificationFields
            .filter((field) => platform || field.key === 'notifyBusinessAdmins')
            .map((field) => (
              <Choice
                key={field.key}
                label={field.label}
                value={String(values.notifications[field.key] ?? 'inherit')}
                options={choices(['inherit', 'true', 'false'])}
                disabled={state.busy}
                onChange={(value) => update('notifications', field.key, value)}
              />
            ))}
          <Text>
            Notifications default to enabled and use the in-app inbox. Email, SMS and push are not
            configured.
          </Text>
          {!platform && (
            <IndustryFields
              value={values.industry}
              onChange={(industry) => setValues({ ...values, industry })}
            />
          )}
          <Action
            label={`Save ${platform ? 'platform' : 'business'} policy`}
            disabled={state.busy || !settingsPolicySchema.safeParse(values).success}
            onPress={() => void settingsModel.policy({ version: policy.version, values }, platform)}
          />
        </>
      )}
    </View>
  );
}
