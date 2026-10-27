import { useId } from 'react';
import { currencySchema } from '@inventory/contracts';
import type { CompanyProfile } from '@inventory/contracts';
import { Input, Select } from '@/components/ui/FormControls';
export function TransactionFields({
  profile,
  onChange,
}: {
  profile: CompanyProfile;
  onChange: (value: CompanyProfile) => void;
}) {
  const id = useId();
  return (
    <fieldset className="space-y-3">
      <legend>Transaction defaults</legend>
      <p className="text-muted-foreground">
        Defaults for new prices. Existing prices, taxes and historical amounts stay unchanged. This
        is not currency conversion.
      </p>
      <label htmlFor={`${id}-currency`}>
        Default transaction currency
        <Select
          id={`${id}-currency`}
          value={profile.transactionCurrency ?? ''}
          onChange={(e) =>
            onChange({
              ...profile,
              transactionCurrency: currencySchema.nullable().parse(e.target.value || null),
            })
          }
        >
          <option value="">Not configured</option>
          {currencySchema.options.map((value) => (
            <option key={value}>{value}</option>
          ))}
        </Select>
      </label>
      <label htmlFor={`${id}-tax`}>
        Default tax rate (basis points; 100 = 1%)
        <Input
          id={`${id}-tax`}
          type="number"
          min={0}
          max={10000}
          step={1}
          value={profile.taxBasisPoints ?? ''}
          onChange={(e) =>
            onChange({
              ...profile,
              taxBasisPoints: e.target.value === '' ? null : Number(e.target.value),
            })
          }
        />
      </label>
      <label htmlFor={`${id}-inclusive`}>
        Tax treatment
        <Select
          id={`${id}-inclusive`}
          value={String(profile.taxInclusive)}
          onChange={(e) => onChange({ ...profile, taxInclusive: e.target.value === 'true' })}
        >
          <option value="false">Added to price</option>
          <option value="true">Included in price</option>
        </Select>
      </label>
    </fieldset>
  );
}
