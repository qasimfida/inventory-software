import { useState } from 'react';
import { Image, Platform, Pressable, View } from 'react-native';
import type { SkuFeedback } from '@inventory/api-client';
import { Text } from '../ui/Themed';
import { useTheme } from '../theme';
import { metrics } from '../ui/metrics';
/** Touch, hover and keyboard equivalent of the browser's SKU tooltip. */
export function SkuStatus({
  feedback,
  preview = false,
}: {
  feedback: SkuFeedback | null;
  preview?: boolean;
}) {
  const [open, setOpen] = useState(false),
    [failed, setFailed] = useState(false);
  const theme = useTheme();
  if (
    !feedback ||
    !['available', 'duplicate'].includes(feedback.state) ||
    (preview && feedback.state !== 'duplicate')
  )
    return null;
  const available = feedback.state === 'available';
  const label = preview
    ? 'View existing SKU product'
    : available
      ? 'SKU ID is available.'
      : 'SKU ID already exists.';
  const product = feedback.product;
  return (
    <View style={{ zIndex: open ? 2 : 0 }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen(Platform.OS === 'web' ? true : !open)}
        onHoverIn={() => setOpen(true)}
        onHoverOut={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        style={{
          minWidth: metrics.target,
          minHeight: metrics.target,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text
          tone={preview ? 'muted' : available ? 'success' : 'error'}
          style={{ fontSize: theme.iconSize }}
        >
          {preview ? 'ⓘ' : available ? '✓' : '×'}
        </Text>
      </Pressable>
      {open && (
        <View
          style={{
            position: 'absolute',
            top: metrics.target,
            right: 0,
            width: 220,
            padding: theme.spacing.small,
            backgroundColor: theme.colors.card,
            borderColor: theme.colors.border,
            borderWidth: 1,
            borderRadius: theme.controlRadius,
            zIndex: 3,
          }}
        >
          {preview && product ? (
            <View style={{ flexDirection: 'row', gap: theme.spacing.small }}>
              {product.image && !failed && (
                <Image
                  source={{ uri: product.image }}
                  accessibilityLabel=""
                  onError={() => setFailed(true)}
                  style={{ width: 40, height: 40 }}
                  resizeMode="contain"
                />
              )}
              <View style={{ flex: 1 }}>
                <Text>{product.name}</Text>
                <Text tone="muted">SKU: {product.sku}</Text>
              </View>
            </View>
          ) : (
            <Text>
              {preview
                ? 'Product details are unavailable for your access level. Choose a different SKU.'
                : label}
            </Text>
          )}
        </View>
      )}
    </View>
  );
}
