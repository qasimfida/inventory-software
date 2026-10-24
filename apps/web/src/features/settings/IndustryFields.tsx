import { useId } from 'react';
import { defaultIndustry, industryConventions, industryProfileSchema } from '@inventory/contracts';
import type { IndustryProfile } from '@inventory/contracts';
import { Input, Select } from '@/components/ui/FormControls';
export function IndustryFields({
  value = defaultIndustry,
  onChange,
}: {
  value?: IndustryProfile | undefined;
  onChange: (value: IndustryProfile) => void;
}) {
  const id = useId(),
    valid = industryProfileSchema.safeParse(value).success;
  return (
    <fieldset className="space-y-2">
      <legend>Industry profile</legend>
      <label htmlFor={`${id}-kind`}>
        Business profile
        <Select
          aria-label="Business profile"
          id={`${id}-kind`}
          value={value.kind}
          onChange={(e) => onChange({ ...value, kind: e.target.value as IndustryProfile['kind'] })}
        >
          {Object.entries(industryConventions).map(([key, profile]) => (
            <option key={key} value={key}>
              {profile.label}
            </option>
          ))}
        </Select>
      </label>
      <label htmlFor={`${id}-threshold`}>
        Low-stock threshold (SKU base units)
        <Input
          id={`${id}-threshold`}
          inputMode="decimal"
          aria-invalid={!valid}
          aria-describedby={!valid ? `${id}-error` : undefined}
          value={value.lowStockThreshold}
          onChange={(e) => onChange({ ...value, lowStockThreshold: e.target.value })}
        />
      </label>
      {!valid && (
        <p id={`${id}-error`} role="alert" className="text-destructive">
          Enter a nonnegative quantity with up to 12 whole digits and 6 decimal places.
        </p>
      )}
      <p className="text-sm">
        Available stock at or below this threshold is low. Notifications occur on a subsequent
        crossing; changing this value does not backfill alerts. Profiles share the same transaction
        rules. Regulated, expiry, lot and industry-specific tax workflows are not configured.
      </p>
    </fieldset>
  );
}
