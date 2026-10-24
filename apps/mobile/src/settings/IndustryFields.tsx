import { defaultIndustry, industryConventions, industryProfileSchema } from '@inventory/contracts';
import type { IndustryProfile } from '@inventory/contracts';
import { Choice, Field } from '../ui/Controls';
import { Text } from '../ui/Themed';
export function IndustryFields({
  value = defaultIndustry,
  onChange,
}: {
  value?: IndustryProfile | undefined;
  onChange: (value: IndustryProfile) => void;
}) {
  return (
    <>
      <Text accessibilityRole="header">Industry profile</Text>
      <Choice
        label="Business profile"
        value={value.kind}
        options={Object.entries(industryConventions).map(([key, p]) => ({
          value: key,
          label: p.label,
        }))}
        onChange={(kind) => onChange({ ...value, kind: kind as IndustryProfile['kind'] })}
      />
      <Field
        label="Low-stock threshold (SKU base units)"
        value={value.lowStockThreshold}
        onChange={(lowStockThreshold) => onChange({ ...value, lowStockThreshold })}
      />
      {!industryProfileSchema.safeParse(value).success && (
        <Text accessibilityRole="alert" tone="error">
          Enter a nonnegative quantity with up to 12 whole digits and 6 decimal places.
        </Text>
      )}
      <Text>
        Available stock at or below this threshold is low. Alerts occur on subsequent crossings,
        without backfill. Profiles share transaction rules. Regulated, expiry, lot and industry tax
        workflows are not configured.
      </Text>
    </>
  );
}
