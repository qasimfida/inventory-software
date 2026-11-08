import { useEffect, useMemo, useRef } from 'react';
import { PanResponder, View } from 'react-native';
import { useTheme } from '../theme';
/** Tablet splitter; native accessibility actions offer the same bounded width changes. */
export function PanelResizeHandle({
  width,
  maximum,
  onChange,
}: {
  width: number;
  maximum: number;
  onChange: (width: number) => void;
}) {
  const theme = useTheme();
  const current = useRef({ width, maximum, onChange });
  useEffect(() => {
    current.current = { width, maximum, onChange };
  }, [width, maximum, onChange]);
  const start = useRef(width);
  const resize = (next: number) =>
    current.current.onChange(Math.max(320, Math.min(current.current.maximum, next)));
  const responder = useMemo(
    () =>
      // eslint-disable-next-line react-hooks/refs -- PanResponder registers event callbacks; it does not invoke them during render.
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: () => {
          start.current = current.current.width;
        },
        onPanResponderMove: (event, gesture) => {
          void event;
          resize(start.current - gesture.dx);
        },
      }),
    [],
  );
  return (
    <View
      {...responder.panHandlers}
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel="Drawer width"
      accessibilityHint="Drag left to widen or right to narrow"
      accessibilityValue={{
        min: 320,
        max: maximum,
        now: Math.round(width),
        text: `${Math.round(width)} pixels wide`,
      }}
      accessibilityActions={[
        { name: 'increment', label: 'Widen drawer' },
        { name: 'decrement', label: 'Narrow drawer' },
      ]}
      onAccessibilityAction={(event) =>
        resize(width + (event.nativeEvent.actionName === 'increment' ? 32 : -32))
      }
      style={{
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
        width: 20,
        zIndex: 2,
        justifyContent: 'center',
      }}
    >
      <View
        style={{
          width: 4,
          height: 48,
          borderRadius: theme.radius,
          backgroundColor: theme.tokens.border,
        }}
      />
    </View>
  );
}
