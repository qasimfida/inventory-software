import { preferencePatchSchema, type PreferencePatch } from '@inventory/contracts';
import { View } from 'react-native';
import { Choice } from './Controls';
import { useTheme } from '../theme';
/** Local native showcase state; no settings transport or business mutation. */
export function FoundationPreferences({
  value,
  onChange,
}: {
  value: PreferencePatch;
  onChange: (next: PreferencePatch) => void;
}) {
  const theme = useTheme();
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
    <View style={{ gap: theme.spacing.small }}>
      {fields.map((field) => (
        <Choice
          key={field.key}
          inline
          label={field.label}
          value={theme.preferences[field.key] ?? ''}
          options={field.options.map((option) => ({ value: option, label: option }))}
          onChange={(next) =>
            onChange(preferencePatchSchema.parse({ ...value, [field.key]: next }))
          }
        />
      ))}
    </View>
  );
}
