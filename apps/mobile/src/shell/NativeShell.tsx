import {
  OnlineSelectionDockProvider,
  useOnlineSelectionDock,
} from '../storefront/OnlineSelectionDock';
import { NativeHeader } from './NativeHeader';
import { PageTitleContext } from '../ui/ScreenHeader';
import { SettingsTabs } from './SettingsScreen';
import { CartDockProvider, useCartDock } from '../pos/CartDock';
import { Action } from '../ui/Controls';
import { ScrollEvents, useScrollEvents } from '../ui/ScrollEvents';
import { NativeProfileMenu } from './NativeProfileMenu';
import { HeaderSearch } from './HeaderSearch';
import { NativeStatus } from './NativeStatus';
import { useRef } from 'react';
import type { ComponentRef } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { availableRoutes, workspaceRoutes } from '@inventory/api-client';
import { Text } from '../ui/Themed';
import { useTheme } from '../theme';
import { metrics } from '../ui/metrics';
import { useWorkspace } from './WorkspaceContext';
import { useNavigation } from './Navigation';
import { NativeScreens } from './NativeScreens';
import { MoreScreen } from './MoreScreen';
export function NativeShell() {
  return (
    <OnlineSelectionDockProvider>
      <CartDockProvider>
        <ShellContent />
      </CartDockProvider>
    </OnlineSelectionDockProvider>
  );
}
function ShellContent() {
  const { cart } = useCartDock();
  const { selection } = useOnlineSelectionDock();
  const scrollEvents = useScrollEvents();
  const theme = useTheme(),
    { path, navigate } = useNavigation(),
    { business, selectionKey } = useWorkspace(),
    scroll = useRef<ComponentRef<typeof ScrollView>>(null);
  const routes = availableRoutes(business),
    tabs = ['/dashboard', '/pos', '/inventory', '/settings/profile'].filter((p) =>
      routes.some((r) => r.path === p),
    );
  function go(next: string, root = false) {
    navigate(next, root);
    scroll.current?.scrollTo({ y: 0, animated: false });
  }
  return (
    <SafeAreaView
      edges={
        __DEV__ && process.env.EXPO_PUBLIC_USE_MOCKS === 'true'
          ? ['left', 'right', 'bottom']
          : ['top', 'left', 'right', 'bottom']
      }
      style={{ flex: 1, backgroundColor: theme.colors.background }}
    >
      <StatusBar barStyle={theme.mode === 'dark' ? 'light-content' : 'dark-content'} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <NativeHeader />
        <NativeStatus go={go} />
        <HeaderSearch go={go} />
        {path.startsWith('/settings/') && <SettingsTabs />}
        <ScrollEvents.Provider value={scrollEvents}>
          <ScrollView
            ref={scroll}
            onScroll={scrollEvents.notify}

            scrollEventThrottle={100}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            automaticallyAdjustKeyboardInsets
            contentContainerStyle={{
              padding: theme.spacing.medium,
              gap: theme.spacing.medium,
              flexGrow: 1,
            }}
          >
            {path === '/more' && <MoreScreen go={go} />}
            <View
              style={{ display: path === '/more' ? 'none' : 'flex' }}
              accessibilityElementsHidden={path === '/more'}
              importantForAccessibility={path === '/more' ? 'no-hide-descendants' : 'auto'}
            >
              <PageTitleContext.Provider
                value={workspaceRoutes.find((r) => r.path === path)?.title ?? ''}
              >
                <NativeScreens key={`${business?.id ?? 'onboarding'}-${selectionKey}`} />
              </PageTitleContext.Provider>
            </View>
          </ScrollView>
        </ScrollEvents.Provider>
        {path.startsWith('/online-store/products') && selection && (
          <View style={{ padding: theme.spacing.small, backgroundColor: theme.colors.card }}>
            <Action
              label={`${selection.count} selected · Review bulk actions`}
              onPress={selection.open}
            />
          </View>
        )}
        {['/pos', '/cash', '/sales'].includes(path) && cart && (
          <View style={{ padding: theme.spacing.small, backgroundColor: theme.colors.card }}>
            <Action label={cart.label} onPress={cart.open} />
          </View>
        )}
        <View
          accessibilityRole="tablist"
          style={{
            flexDirection: 'row',
            borderTopWidth: metrics.border,
            borderColor: theme.colors.border,
            backgroundColor: theme.colors.card,
          }}
        >
          <NativeProfileMenu preferences />
          {[...tabs, '/more'].map((p) => (
            <Pressable
              key={p}
              accessibilityRole="tab"
              accessibilityState={{ selected: path === p }}
              accessibilityLabel={
                p === '/more' ? 'More' : workspaceRoutes.find((r) => r.path === p)!.title
              }
              onPress={() => go(p, true)}
              style={{
                flex: 1,
                minHeight: metrics.target,
                padding: theme.spacing.small,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: path === p ? theme.tokens.selected : theme.colors.card,
              }}
            >
              <Text
                style={{
                  fontSize: metrics.label,
                  textAlign: 'center',
                  color: path === p ? theme.tokens['selected-foreground'] : theme.colors.foreground,
                }}
              >
                {
                  (
                    {
                      '/dashboard': 'Home',
                      '/pos': 'POS',
                      '/inventory': 'Stock',
                      '/settings/profile': 'Profile',
                      '/more': 'More',
                    } as Record<string, string>
                  )[p]
                }
              </Text>
            </Pressable>
          ))}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
