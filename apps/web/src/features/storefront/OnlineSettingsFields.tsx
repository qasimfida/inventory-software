import type { OnlineStoreSettings, Location } from '@inventory/contracts';
import {
  setupFields,
  updateSetupField,
  toggleFulfillment,
  fulfillmentCount,
} from '@inventory/api-client';
import type { OnlineSettingsSection } from '@inventory/api-client';
import { FormField } from '@/components/common/FormField';
import { Input } from '@/components/ui/FormControls';
import { Textarea } from '@/components/ui/FormControls';
import { Select } from '@/components/ui/Select';
import { Switch } from '@/components/ui/Switch';
import { Segmented } from '@/components/ui/Segmented';
import { Checkbox } from '@/components/ui/Checkbox';
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
    <fieldset disabled={disabled} className="space-y-5">
      <legend className="sr-only">Online store settings</legend>
      {section === 'fulfillment' && (
        <>
          {(['pickup', 'cashOnDelivery', 'manualBankTransfer'] as const).map((kind) => {
            const enabled =
              kind === 'cashOnDelivery'
                ? draft.fulfillment.cashOnDelivery
                : draft.fulfillment[kind].enabled;
            return (
              <Switch
                key={kind}
                label={
                  {
                    pickup: 'Pickup',
                    cashOnDelivery: 'Cash on delivery',
                    manualBankTransfer: 'Manual bank transfer',
                  }[kind]
                }
                checked={enabled}
                disabled={disabled || (enabled && fulfillmentCount(draft) === 1)}
                description={
                  enabled && fulfillmentCount(draft) === 1
                    ? 'Keep at least one method enabled.'
                    : 'Configuration only; checkout and payment collection are not available yet.'
                }
                onCheckedChange={(value) => edit(toggleFulfillment(draft, kind, value))}
              />
            );
          })}
          {draft.fulfillment.pickup.enabled && (
            <FormField label="Pickup location">
              {(props) => (
                <Select
                  {...props}
                  disabled={disabled}
                  value={draft.fulfillment.pickup.locationId ?? ''}
                  onChange={(e) =>
                    edit({
                      ...draft,
                      fulfillment: {
                        ...draft.fulfillment,
                        pickup: { ...draft.fulfillment.pickup, locationId: e.target.value || null },
                      },
                    })
                  }
                >
                  <option value="">Choose location</option>
                  {locations
                    .filter(
                      (l) =>
                        l.id === draft.storeId ||
                        warehouses.some((w) => w.id === l.id && draft.stockSources.includes(w.id)),
                    )
                    .map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.name}
                      </option>
                    ))}
                </Select>
              )}
            </FormField>
          )}
          <p className="text-sm text-muted-foreground">
            Card payments: Not available yet. Cash on delivery remains unpaid until collection is
            confirmed. Manual transfers require clearing-account confirmation when payments are
            implemented.
          </p>
        </>
      )}
      <div className="grid gap-5 md:grid-cols-2">
        {setupFields(draft, section).map((field) => (
          <FormField
            key={field.key}
            label={field.label}
            description={[
              field.hint,
              field.multiline ? `${field.value.length} / ${field.max} characters` : '',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            {(props) =>
              field.multiline ? (
                <Textarea
                  {...props}
                  value={field.value}
                  maxLength={field.max}
                  onChange={(e) => edit(updateSetupField(draft, field.key, e.target.value))}
                />
              ) : (
                <Input
                  {...props}
                  value={field.value}
                  maxLength={field.max}
                  onChange={(e) => edit(updateSetupField(draft, field.key, e.target.value))}
                />
              )
            }
          </FormField>
        ))}
      </div>
      {section === 'general' && (
        <>
          <p>Currency: {draft.currency}. Prices follow the existing store price resolver.</p>
          <fieldset className="space-y-2">
            <legend>Stock-source warehouses</legend>
            <p className="text-sm text-muted-foreground">
              Online availability comes from these warehouses linked to this store.
            </p>
            {warehouses.map((w) => (
              <label key={w.id} className="flex items-center gap-2">
                <Checkbox
                  disabled={disabled}
                  checked={draft.stockSources.includes(w.id)}
                  onCheckedChange={(checked) =>
                    edit({
                      ...draft,
                      stockSources: checked
                        ? [...draft.stockSources, w.id]
                        : draft.stockSources.filter((id) => id !== w.id),
                    })
                  }
                />
                {w.name}
              </label>
            ))}
            {!warehouses.length && (
              <p>Create an active warehouse linked to this store in Stores & terminals.</p>
            )}
          </fieldset>
          <Segmented
            label="Sold-out products"
            value={draft.soldOutBehavior === 'show' ? 'Show as Sold out' : 'Hide'}
            options={['Show as Sold out', 'Hide']}
            disabled={disabled}
            onChange={(value) =>
              edit({ ...draft, soldOutBehavior: value === 'Hide' ? 'hide' : 'show' })
            }
          />
        </>
      )}
    </fieldset>
  );
}
