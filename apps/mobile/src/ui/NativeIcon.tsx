import { View } from 'react-native';
import { Text } from './Themed';
import { useTheme } from '../theme';
import { metrics } from './metrics';
/** Small native geometry for shell icons; no DOM SVG or icon font dependency. */
export function NativeIcon({
  name,
  color: suppliedColor,
  small = false,
}: {
  name: string;
  color?: string;
  small?: boolean;
}) {
  const theme = useTheme(),
    color = suppliedColor ?? theme.colors.foreground,
    size = small
      ? (theme.iconSize * parseFloat(theme.tokens['icon-small'])) /
        parseFloat(theme.tokens['icon-medium'])
      : theme.iconSize;
  const stroke = { borderWidth: metrics.border * 2, borderColor: color };
  const frame = {
    width: size,
    height: size,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  };
  if (name === 'cart')
    return (
      <View style={frame}>
        <View style={{ ...stroke, width: size * 0.8, height: size * 0.55, borderTopWidth: 0 }} />
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', width: size * 0.65 }}>
          {[0, 1].map((i) => (
            <View
              key={i}
              style={{
                width: size * 0.16,
                height: size * 0.16,
                borderRadius: size,
                backgroundColor: color,
              }}
            />
          ))}
        </View>
      </View>
    );
  if (name === 'bell')
    return (
      <View style={frame}>
        <View
          style={{
            ...stroke,
            width: size * 0.7,
            height: size * 0.75,
            borderTopLeftRadius: size,
            borderTopRightRadius: size,
          }}
        />
        <View
          style={{
            width: metrics.unit,
            height: metrics.unit,
            borderRadius: metrics.radius,
            backgroundColor: color,
          }}
        />
      </View>
    );
  if (name === 'user')
    return (
      <View style={frame}>
        <View style={{ ...stroke, width: size * 0.45, height: size * 0.45, borderRadius: size }} />
        <View
          style={{
            ...stroke,
            width: size * 0.8,
            height: size * 0.45,
            borderTopLeftRadius: size,
            borderTopRightRadius: size,
          }}
        />
      </View>
    );
  if (name === 'search')
    return (
      <View style={frame}>
        <View style={{ ...stroke, width: size * 0.65, height: size * 0.65, borderRadius: size }} />
        <View
          style={{
            width: size * 0.4,
            height: metrics.border * 2,
            backgroundColor: color,
            transform: [{ rotate: '45deg' }],
            alignSelf: 'flex-end',
          }}
        />
      </View>
    );
  if (name === 'cloud')
    return (
      <View style={frame}>
        <View
          style={{ ...stroke, width: size, height: size * 0.6, borderRadius: metrics.radius }}
        />
        <View
          style={{
            ...stroke,
            position: 'absolute',
            top: 0,
            width: size * 0.55,
            height: size * 0.55,
            borderRadius: size,
            backgroundColor: theme.colors.card,
          }}
        />
      </View>
    );
  if (name === 'wifi')
    return (
      <View style={frame}>
        {[1, 0.65].map((scale) => (
          <View
            key={scale}
            style={{
              width: size * scale,
              height: size * 0.3,
              borderTopWidth: metrics.border * 2,
              borderColor: color,
              borderTopLeftRadius: size,
              borderTopRightRadius: size,
            }}
          />
        ))}
        <View
          style={{
            width: metrics.unit,
            height: metrics.unit,
            borderRadius: metrics.radius,
            backgroundColor: color,
          }}
        />
      </View>
    );
  return (
    <Text accessible={false} style={{ fontSize: size }}>
      {name}
    </Text>
  );
}
