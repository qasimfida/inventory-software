import type { OnlineStoreSettings, Location } from '@inventory/contracts';
import {
  setupFields,
  updateSetupField,
  toggleFulfillment,
  fulfillmentCount,
} from '@inventory/api-client';
import type { OnlineSettingsSection } from '@inventory/api-client';
import { Field, Choice } from '../ui/Controls';
import { SettingSwitch } from '../ui/SettingSwitch';
import { Checkbox } from '../ui/Checkbox';
import { Text } from '../ui/Themed';
export function OnlineSettingsFields({
  draft,
  section,
  locations,
  disabled,
  edit,
}: {
  draft: OnlineStoreSettings;
  section: OnlineSettingsSection;
  locations: Location[];
  disabled: boolean;
  edit: (s: OnlineStoreSettings) => void;
}) {
  const warehouses = locations.filter(
    (l) => l.kind === 'warehouses' && l.storeId === draft.storeId && l.state === 'active',
  );
  return (
    <>
      {section === 'fulfillment' && (
        <>
          {(['pickup', 'cashOnDelivery', 'manualBankTransfer'] as const).map((kind) => {
            const enabled =
              kind === 'cashOnDelivery'
                ? draft.fulfillment.cashOnDelivery
                : draft.fulfillment[kind].enabled;
            return (
              <SettingSwitch
                key={kind}
                label={
                  {
                    pickup: 'Pickup',
                    cashOnDelivery: 'Cash on delivery',
                    manualBankTransfer: 'Manual bank transfer',
                  }[kind]
                }
                value={enabled}
                disabled={disabled || (enabled && fulfillmentCount(draft) === 1)}
                description={
                  enabled && fulfillmentCount(draft) === 1
                    ? 'Keep at least one method enabled.'
                    : 'Configuration only; checkout and payment collection are not available yet.'
                }
                onChange={(value) => edit(toggleFulfillment(draft, kind, value))}
              />
            );
          })}
          {draft.fulfillment.pickup.enabled && (
            <Choice
              label="Pickup location"
              disabled={disabled}
              value={draft.fulfillment.pickup.locationId ?? ''}
              onChange={(value) =>
                edit({
                  ...draft,
                  fulfillment: {
                    ...draft.fulfillment,
                    pickup: { ...draft.fulfillment.pickup, locationId: value || null },
                  },
                })
              }
              options={[
                { value: '', label: 'Choose location' },
                ...locations
                  .filter(
                    (l) =>
                      l.id === draft.storeId ||
                      warehouses.some((w) => w.id === l.id && draft.stockSources.includes(w.id)),
                  )
                  .map((l) => ({ value: l.id, label: l.name })),
              ]}
            />
          )}
          <Text tone="muted">
            Card payments: Not available yet. Cash on delivery remains unpaid until collection is
            confirmed. Manual transfers require clearing-account confirmation when payments are
            implemented.
          </Text>
        </>
      )}
      {setupFields(draft, section).map((field) => (
        <Field
          key={field.key}
          label={field.label}
          description={[
            field.hint,
            field.multiline ? `${field.value.length} / ${field.max} characters` : '',
          ]
            .filter(Boolean)
            .join(' ')}
          disabled={disabled}
          value={field.value}
          maxLength={field.max}
          multiline={!!field.multiline}
          onChange={(value) => edit(updateSetupField(draft, field.key, value))}
        />
      ))}
      {section === 'general' && (
        <>
          <Text>Currency: {draft.currency}. Prices follow the existing store price resolver.</Text>
          <Text accessibilityRole="header">Stock-source warehouses</Text>
          <Text tone="muted">
            Online availability comes from these warehouses linked to this store.
          </Text>
          {warehouses.map((w) => (
            <Checkbox
              key={w.id}
              label={w.name}
              disabled={disabled}
              value={draft.stockSources.includes(w.id)}
              onChange={(checked) =>
                edit({
                  ...draft,
                  stockSources: checked
                    ? [...draft.stockSources, w.id]
                    : draft.stockSources.filter((id) => id !== w.id),
                })
              }
            />
          ))}
          {!warehouses.length && (
            <Text>Create an active warehouse linked to this store in Stores & terminals.</Text>
          )}
          <Choice
            inline
            label="Sold-out products"
            disabled={disabled}
            value={draft.soldOutBehavior}
            options={[
              { value: 'show', label: 'Show as Sold out' },
              { value: 'hide', label: 'Hide' },
            ]}
            onChange={(value) =>
              edit({ ...draft, soldOutBehavior: value === 'hide' ? 'hide' : 'show' })
            }
          />
        </>
      )}
    </>
  );
}
