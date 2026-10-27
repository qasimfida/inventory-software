import type { ReactNode } from 'react';
import { View } from 'react-native';
import { useTheme } from '../theme';
export function Surface({ children, muted = false }: { children: ReactNode; muted?: boolean }) {
  const theme = useTheme();
  return (
    <View
      style={{
        padding: theme.spacing.medium,
        gap: theme.spacing.small,
        borderRadius: theme.radius,
        backgroundColor: muted ? theme.tokens.muted : theme.colors.card,
        borderWidth: 1,
        borderColor: theme.tokens.border,
      }}
    >
      {children}
    </View>
  );
}
