import { createContext, useContext } from 'react';
export const PageTitleContext = createContext('');
import { metrics } from './metrics';
import { View } from 'react-native';
import type { ReactNode } from 'react';
import { Text } from './Themed';
import { useTheme } from '../theme';

export function ScreenHeader({ title, description }: { title: string; description?: ReactNode }) {
  const theme = useTheme();
  const duplicate = useContext(PageTitleContext) === title;
  if (duplicate && !description) return null;
  return (
    <View
      style={{
        gap: theme.spacing.small,
        paddingBottom: theme.spacing.medium,
        marginBottom: theme.spacing.small,
        borderBottomWidth: metrics.border,
        borderColor: theme.tokens.border,
      }}
    >
      {!duplicate && (
        <Text accessibilityRole="header" style={{ fontSize: metrics.title, fontWeight: '600' }}>
          {title}
        </Text>
      )}
      {Boolean(description) && <Text tone="muted">{description}</Text>}
    </View>
  );
}

export function ScreenBody({ children }: { children: ReactNode }) {
  const theme = useTheme();
  return (
    <View style={{ gap: theme.spacing.medium, minWidth: 0, paddingVertical: theme.spacing.small }}>
      {children}
    </View>
  );
}
