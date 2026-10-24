import { useSyncExternalStore } from 'react';
import { Pressable, View } from 'react-native';
import { preferenceFields } from '@inventory/api-client';
import { preferencePatchSchema } from '@inventory/contracts';
import { settingsModel } from './model';
import { useTheme } from '../theme';
import { Choice, choices } from '../ui/Controls';
import { Text } from '../ui/Themed';
import { metrics } from '../ui/metrics';
const groups = [
  { title: 'Appearance', keys: ['appearance', 'accent'] },
  { title: 'Typography', keys: ['font', 'textSize'] },
  { title: 'Layout & controls', keys: ['density', 'radius', 'iconSize', 'pagination'] },
  { title: 'Regional', keys: ['currency'] },
  {
    title: 'Accessibility & performance',
    keys: ['motion', 'states', 'visualizations'],
  },
];
export function PreferenceFields() {
  const state = useSyncExternalStore(settingsModel.subscribe, settingsModel.snapshot),
    effective = settingsModel.effective(),
    theme = useTheme();
  const colors = {
    default: theme.tokens.info,
    teal: theme.tokens['primary-teal'],
    violet: theme.tokens['primary-violet'],
    rose: theme.tokens['primary-rose'],
    amber: theme.tokens['primary-amber'],
  };
  return (
    <>
      {groups.map((group) => (
        <View
          key={group.title}
          style={{
            gap: theme.spacing.medium,
            paddingVertical: theme.spacing.medium,
            borderTopWidth: metrics.border,
            borderColor: theme.tokens.border,
          }}
        >
          <Text accessibilityRole="header" style={{ fontWeight: '600' }}>
            {group.title}
          </Text>
          {preferenceFields
            .filter((f) => group.keys.includes(f.key))
            .sort((a, b) => group.keys.indexOf(a.key) - group.keys.indexOf(b.key))
            .map((field) => {
              const enforced =
                  state.snapshot?.platform.values.enforced[field.key] ??
                  state.business?.values.enforced[field.key],
                disabled = state.busy || !state.snapshot || enforced !== undefined;
              const label = `${field.label}${enforced !== undefined ? ' (enforced)' : ''}`;
              const change = (value: string) =>
                void settingsModel.save(preferencePatchSchema.parse({ [field.key]: value }));
              if (field.key === 'accent')
                return (
                  <View key={field.key} style={{ gap: theme.spacing.small }}>
                    <Text>{label}</Text>
                    <View
                      accessibilityRole="radiogroup"
                      accessibilityLabel={label}
                      style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.small }}
                    >
                      {field.options.map((color) => (
                        <Pressable
                          key={color}
                          accessibilityRole="radio"
                          accessibilityLabel={color === 'default' ? 'Blue' : color}
                          accessibilityState={{ checked: effective.accent === color, disabled }}
                          disabled={disabled}
                          onPress={() => change(color)}
                          style={{
                            padding: theme.spacing.small,
                            borderWidth: metrics.border * 2,
                            borderColor:
                              effective.accent === color
                                ? theme.colors.primary
                                : theme.tokens.border,
                            borderRadius: theme.radius,
                          }}
                        >
                          <View
                            style={{
                              width: metrics.target,
                              height: metrics.target,
                              borderRadius: theme.controlRadius,
                              backgroundColor: colors[color],
                            }}
                          />
                          <Text>{color === 'default' ? 'Blue' : color}</Text>
                        </Pressable>
                      ))}
                    </View>
                  </View>
                );
              const options =
                field.key === 'font'
                  ? [...new Set([...field.options, effective.font])]
                  : [...field.options];
              return (
                <Choice
                  key={field.key}
                  label={label}
                  value={effective[field.key]}
                  options={choices(options).map((option) => ({
                    ...option,
                    label:
                      field.key === 'font' && option.value === 'Karla'
                        ? 'App default · Karla'
                        : option.label,
                  }))}
                  inline={options.length <= 3}
                  disabled={disabled}
                  onChange={change}
                />
              );
            })}
        </View>
      ))}
      <Text>
        Native devices use system, Karla, Lora, serif or monospace fonts. Installed font enumeration
        is unavailable; device-specific web fonts fall back to the system font here.
      </Text>
    </>
  );
}
