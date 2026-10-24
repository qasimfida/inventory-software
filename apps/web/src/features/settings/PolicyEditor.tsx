import { AccordionSection } from '@/components/ui/Accordion';
import { IndustryFields } from './IndustryFields';
import { useId, useState, useSyncExternalStore } from 'react';
import { preferenceFields, notificationFields } from '@inventory/api-client';
import { settingsPolicySchema } from '@inventory/contracts';
import type { PolicyRecord, SettingsPolicy } from '@inventory/contracts';
import { settingsModel } from '@/platform/settings';
import { Select } from '@/components/ui/FormControls';
import { Button } from '@/components/ui/Button';
export function PolicyEditor({
  policy,
  platform = false,
}: {
  policy: PolicyRecord;
  platform?: boolean;
}) {
  const [values, setValues] = useState<SettingsPolicy>(policy.values);
  const state = useSyncExternalStore(settingsModel.subscribe, settingsModel.snapshot);
  const id = useId();
  function update(layer: 'defaults' | 'enforced' | 'notifications', key: string, value: string) {
    const next: Record<string, unknown> = { ...values[layer] };
    if (value === 'inherit') delete next[key];
    else next[key] = value === 'true' ? true : value === 'false' ? false : value;
    setValues({ ...values, [layer]: settingsPolicySchema.shape[layer].parse(next) });
  }
  return (
    <AccordionSection
      className="space-y-3 rounded-md border p-3"
      title={<>{platform ? 'Platform policy' : 'Business policy'}</>}
    >
      <p>
        Defaults apply when a user has no preference. Enforced values override personal choices.
        Platform enforcement takes precedence. Authentication limits cannot be edited here.
      </p>
      {(['defaults', 'enforced'] as const).map((layer) => (
        <fieldset key={layer} disabled={state.busy} className="grid gap-2 sm:grid-cols-2">
          <legend>{layer}</legend>
          {preferenceFields.map((field) => (
            <label key={field.key} htmlFor={`${id}-${layer}-${field.key}`}>
              {layer}: {field.label}
              <Select
                id={`${id}-${layer}-${field.key}`}
                aria-label={`${platform ? 'Platform' : 'Business'} ${layer}: ${field.label}`}
                value={values[layer][field.key] ?? 'inherit'}
                onChange={(e) => update(layer, field.key, e.target.value)}
              >
                <option value="inherit">Inherit</option>
                {field.options.map((option) => (
                  <option key={option}>{option}</option>
                ))}
              </Select>
            </label>
          ))}
          <label htmlFor={`${id}-${layer}-effects`}>
            Visual effects
            <Select
              id={`${id}-${layer}-effects`}
              value={String(values[layer].effects ?? 'inherit')}
              onChange={(e) => update(layer, 'effects', e.target.value)}
            >
              <option value="inherit">Inherit</option>
              <option value="true">Enabled</option>
              <option value="false">Disabled</option>
            </Select>
          </label>
        </fieldset>
      ))}
      <fieldset disabled={state.busy}>
        <legend>Security and business notifications</legend>
        {notificationFields
          .filter((field) => platform || field.key === 'notifyBusinessAdmins')
          .map((field) => (
            <label key={field.key}>
              {field.label}
              <Select
                value={String(values.notifications[field.key] ?? 'inherit')}
                onChange={(e) => update('notifications', field.key, e.target.value)}
              >
                <option value="inherit">Inherit (enabled by default)</option>
                <option value="true">Enabled</option>
                <option value="false">Disabled</option>
              </Select>
            </label>
          ))}
      </fieldset>
      <p>
        Delivery is to the in-app inbox. Email, SMS and push providers are not configured. Business
        policy controls business notifications to eligible roles; platform policy controls user and
        platform-admin delivery.
      </p>
      {!platform && (
        <IndustryFields
          value={values.industry}
          onChange={(industry) => setValues({ ...values, industry })}
        />
      )}
      <Button
        disabled={state.busy || !settingsPolicySchema.safeParse(values).success}
        onClick={() => void settingsModel.policy({ version: policy.version, values }, platform)}
      >
        Save {platform ? 'platform' : 'business'} policy
      </Button>
    </AccordionSection>
  );
}
