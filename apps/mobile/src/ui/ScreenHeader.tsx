import { createContext, useContext } from 'react';
export const PageTitleContext = createContext('');
import { metrics } from './metrics';
import { View } from 'react-native';
import type { ReactNode } from 'react';
import { Text } from './Themed';
import { useTheme } from '../theme';

export function ScreenHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  const theme = useTheme();
  const duplicate = useContext(PageTitleContext) === title;
  if (duplicate && !description && !actions) return null;
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
      <View
        style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: theme.spacing.small,
        }}
      >
        <View style={{ flexGrow: 1, flexBasis: 180 }}>
          {!duplicate && (
            <Text accessibilityRole="header" style={{ fontSize: metrics.title, fontWeight: '600' }}>
              {title}
            </Text>
          )}
          {Boolean(description) && <Text tone="muted">{description}</Text>}
        </View>
        {actions && (
          <View
            style={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              alignItems: 'center',
              gap: theme.spacing.small,
            }}
          >
            {actions}
          </View>
        )}
      </View>
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
