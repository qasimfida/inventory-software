import { useState } from 'react';
import { Image, View } from 'react-native';
import { Text } from '../ui/Themed';
import { useTheme } from '../theme';
export function CartThumbnail({ uri, name }: { uri: string | undefined; name: string }) {
  const theme = useTheme();
  const [failed, setFailed] = useState(false);
  return (
    <View
      style={{
        width: theme.spacing.large * 2,
        height: theme.spacing.large * 2,
        borderRadius: theme.radius,
        backgroundColor: theme.tokens.card,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}
    >
      {uri && !failed ? (
        <Image
          source={{ uri }}
          accessibilityLabel={name}
          resizeMode="contain"
          style={{ width: '100%', height: '100%' }}
          onError={() => setFailed(true)}
        />
      ) : (
        <Text accessibilityLabel={`No image for ${name}`} tone="muted">
          ▧
        </Text>
      )}
    </View>
  );
}
