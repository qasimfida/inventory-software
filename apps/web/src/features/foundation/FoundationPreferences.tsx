import { preferencePatchSchema, type PreferencePatch } from '@inventory/contracts';
import { Segmented } from '@/components/ui/Segmented';
import { useAppearance } from '@/theme/Appearance';
/** Local showcase state only; never saves an account preference. */
export function FoundationPreferences({
  value,
  onChange,
}: {
  value: PreferencePatch;
  onChange: (next: PreferencePatch) => void;
}) {
  const { preferences } = useAppearance();
  const fields = [
    { key: 'currency', label: 'Preview display currency', options: ['USD', 'PKR', 'JPY'] },
    {
      key: 'accent',
      label: 'Preview accent',
      options: ['default', 'teal', 'violet', 'rose', 'amber'],
    },
    { key: 'density', label: 'Preview density', options: ['compact', 'default', 'comfortable'] },
    { key: 'controlSize', label: 'Preview control size', options: ['small', 'medium', 'large'] },
    { key: 'animation', label: 'Preview animation', options: ['off', 'minimal', 'full'] },
    { key: 'charts', label: 'Preview charts', options: ['numbers', 'balanced', 'charts'] },
  ] as const;
  return (
    <section className="grid gap-3 sm:grid-cols-2" aria-label="Local foundation preferences">
      {fields.map((field) => (
        <Segmented
          key={field.key}
          label={field.label}
          value={preferences[field.key] ?? ''}
          options={field.options}
          onChange={(next) =>
            onChange(preferencePatchSchema.parse({ ...value, [field.key]: next }))
          }
        />
      ))}
    </section>
  );
}
