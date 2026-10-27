import { ScrollEvents, useScrollEvents } from './ScrollEvents';
import { Modal, Pressable, ScrollView, View, useWindowDimensions } from 'react-native';
import { useEffect, useRef, useState, type ReactNode, type ComponentRef } from 'react';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../theme';
import { metrics } from './metrics';
import { IconAction } from './IconAction';
import { Text } from './Themed';
/** Native right-hand panel, constrained to the viewport and keyboard-safe scroll area. */
export function SidePanel({
  title,
  open,
  onClose,
  children,
  menu = false,
  wide = false,
  footer,
  revealEndKey,
  bottom = false,
}: {
  title: string;
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  menu?: boolean;
  wide?: boolean;
  footer?: ReactNode;
  revealEndKey?: string;
  bottom?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const scroll = useRef<ComponentRef<typeof ScrollView>>(null);
  useEffect(() => {
    if (!revealEndKey) return;
    const frame = requestAnimationFrame(() => scroll.current?.scrollToEnd({ animated: false }));
    return () => cancelAnimationFrame(frame);
  }, [revealEndKey]);
  const scrollEvents = useScrollEvents();
  const theme = useTheme(),
    { width } = useWindowDimensions();
  return (
    <Modal
      visible={open}
      transparent
      animationType={theme.preferences.motion === 'enabled' ? 'slide' : 'none'}
      onRequestClose={onClose}
    >
      <SafeAreaProvider>
        <View
          style={{
            flex: 1,
            flexDirection: bottom ? 'column' : 'row',
            justifyContent: 'flex-end',
            backgroundColor: theme.tokens.overlay,
          }}
        >
          <Pressable accessible={false} onPress={onClose} style={{ flex: 1 }} />
          <SafeAreaView
            accessibilityViewIsModal
            style={{
              ...(bottom ? { height: expanded ? ('100%' as const) : ('80%' as const) } : {}),
              width: bottom
                ? width
                : Math.min(
                    width,
                    parseFloat(
                      theme.tokens[
                        wide ? 'preferences-width' : menu ? 'profile-menu-width' : 'drawer-width'
                      ],
                    ),
                  ),
              backgroundColor: theme.colors.card,
            }}
          >
            <View
              style={{ flexDirection: 'row', alignItems: 'center', padding: theme.spacing.medium }}
            >
              <Text accessibilityRole="header" style={{ flex: 1, fontWeight: '600' }}>
                {title}
              </Text>
              {bottom && (
                <IconAction
                  label={expanded ? 'Collapse details' : 'Expand details'}
                  icon={expanded ? '↓' : '↑'}
                  onPress={() => setExpanded((v) => !v)}
                />
              )}
              <IconAction label={`Close ${title.toLowerCase()}`} icon="×" onPress={onClose} />
            </View>
            <ScrollEvents.Provider value={scrollEvents}>
              <ScrollView
                ref={scroll}
                onContentSizeChange={() => {
                  if (revealEndKey) {
                    scroll.current?.scrollToEnd({ animated: false });
                  }
                }}
                onScroll={scrollEvents.notify}
                scrollEventThrottle={100}
                keyboardShouldPersistTaps="handled"
                automaticallyAdjustKeyboardInsets
                contentContainerStyle={{ padding: theme.spacing.medium, gap: theme.spacing.medium }}
              >
                {children}
              </ScrollView>
            </ScrollEvents.Provider>
            {footer && (
              <View
                style={{
                  padding: theme.spacing.medium,
                  borderTopWidth: metrics.border,
                  borderColor: theme.tokens.border,
                }}
              >
                {footer}
              </View>
            )}
          </SafeAreaView>
        </View>
      </SafeAreaProvider>
    </Modal>
  );
}
