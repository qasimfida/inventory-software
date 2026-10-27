import { useRef, useState, type ReactNode, type ElementRef } from 'react';
import { ScrollView, View } from 'react-native';
import { IconAction } from './IconAction';
import { useTheme } from '../theme';
/** Native overflow controls keep the tab bar reachable without a persistent scrollbar. */
export function ScrollableTabs({
  children,
  label = 'Settings',
}: {
  children: ReactNode;
  label?: string;
}) {
  const theme = useTheme(),
    ref = useRef<ElementRef<typeof ScrollView>>(null);
  const [offset, setOffset] = useState(0),
    [width, setWidth] = useState(0),
    [content, setContent] = useState(0);
  const overflow = content > width + 1;
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.tokens.secondary,
        borderRadius: theme.controlRadius,
      }}
    >
      {overflow && (
        <IconAction
          label={`Scroll ${label.toLowerCase()} tabs left`}
          icon="‹"
          disabled={offset <= 1}
          onPress={() =>
            ref.current?.scrollTo({
              x: Math.max(0, offset - width * 0.7),
              animated: theme.preferences.motion === 'enabled',
            })
          }
        />
      )}
      <ScrollView
        ref={ref}
        horizontal
        showsHorizontalScrollIndicator={false}
        accessibilityRole="tablist"
        accessibilityLabel={`${label} navigation`}
        style={{ flex: 1 }}
        contentContainerStyle={{
          gap: parseFloat(theme.tokens['space-unit']),
          padding: parseFloat(theme.tokens['space-unit']),
        }}
        onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
        onContentSizeChange={(w) => setContent(w)}
        onScroll={(e) => setOffset(e.nativeEvent.contentOffset.x)}
        scrollEventThrottle={100}
      >
        {children}
      </ScrollView>
      {overflow && (
        <IconAction
          label={`Scroll ${label.toLowerCase()} tabs right`}
          icon="›"
          disabled={offset + width >= content - 1}
          onPress={() =>
            ref.current?.scrollTo({
              x: offset + width * 0.7,
              animated: theme.preferences.motion === 'enabled',
            })
          }
        />
      )}
    </View>
  );
}
