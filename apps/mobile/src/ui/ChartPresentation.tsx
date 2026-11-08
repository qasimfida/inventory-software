import { useState, type ReactNode } from 'react';
import { View } from 'react-native';
import { useTheme } from '../theme';
import { Action } from './Action';
/** Native counterpart: hiding a chart never hides values or record actions. */
export function ChartPresentation({
  label,
  children,
  values,
}: {
  label: string;
  children: ReactNode;
  values: ReactNode;
}) {
  const theme = useTheme();
  const [revealed, setRevealed] = useState(false);
  const numbers = theme.preferences.charts === 'numbers';
  return (
    <View style={{ gap: theme.spacing.small }}>
      {numbers && (
        <Action
          variant="ghost"
          label={`${revealed ? 'Hide' : 'Show'} ${label}`}
          onPress={() => setRevealed(!revealed)}
        />
      )}
      {(!numbers || revealed) && children}
      {values}
    </View>
  );
}
