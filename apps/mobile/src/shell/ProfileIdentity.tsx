import { Image, View } from 'react-native';
import { useTheme } from '../theme';
import { Text } from '../ui/Themed';
export function ProfileIdentity({
  email,
  role,
  displayName,
  logo,
}: {
  email: string;
  role: string;
  displayName?: string;
  logo?: string;
}) {
  const theme = useTheme(),
    name = displayName ?? (email.split('@')[0] || 'My account'),
    size = parseFloat(theme.tokens['avatar-size']);
  return (
    <View
      style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.small, minWidth: 0 }}
    >
      <View
        accessible={false}
        style={{
          width: size,
          flexShrink: 0,
          overflow: 'hidden',
          height: size,
          borderRadius: theme.controlRadius,
          backgroundColor: theme.tokens.secondary,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {logo ? (
          <Image
            source={{ uri: logo }}
            accessibilityLabel="Company logo"
            style={{ width: size, height: size }}
            resizeMode="contain"
          />
        ) : (
          <Text style={{ color: theme.tokens['secondary-foreground'], fontWeight: '600' }}>
            {name.slice(0, 2).toUpperCase()}
          </Text>
        )}
      </View>
      <View style={{ flexShrink: 1 }}>
        <Text
          numberOfLines={1}
          style={{ fontSize: parseFloat(theme.tokens['font-control']), fontWeight: '500' }}
        >
          {name}
        </Text>
        <Text tone="muted" style={{ fontSize: parseFloat(theme.tokens['font-small']) }}>
          {role.replaceAll('_', ' ')}
        </Text>
      </View>
    </View>
  );
}
