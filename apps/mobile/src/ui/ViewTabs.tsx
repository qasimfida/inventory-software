import { Pressable, View } from 'react-native';
import { Text } from './Themed';
import { useTheme } from '../theme';
import { metrics } from './metrics';
export function ViewTabs({
  grid,
  onChange,
  label = 'View',
}: {
  grid: boolean;
  onChange: (grid: boolean) => void;
  label?: string;
}) {
  const theme = useTheme();
  return (
    <View
      accessibilityRole="tablist"
      accessibilityLabel={label}
      style={{
        flexDirection: 'row',
        borderRadius: theme.controlRadius,
        backgroundColor: theme.tokens.muted,
        padding: metrics.unit,
      }}
    >
      {['List', 'Grid'].map((name, index) => (
        <Pressable
          key={name}
          accessibilityRole="tab"
          accessibilityLabel={`${label} ${name.toLowerCase()} view`}
          accessibilityState={{ selected: grid === !!index }}
          onPress={() => onChange(!!index)}
          style={{
            minHeight: metrics.target,
            paddingHorizontal: theme.spacing.medium,
            justifyContent: 'center',
            borderRadius: theme.controlRadius,
            backgroundColor: grid === !!index ? theme.colors.card : 'transparent',
          }}
        >
          <Text>{name}</Text>
        </Pressable>
      ))}
    </View>
  );
}
