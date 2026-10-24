import { useEffect, useRef, useState } from 'react';
import type { ComponentRef } from 'react';
import { AccessibilityInfo, Modal, Platform, ScrollView } from 'react-native';
import type { View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { Text } from './Themed';
import { Action } from './Controls';
import { useTheme } from '../theme';
export function ConfirmAction({
  label,
  description,
  disabled = false,
  onConfirm,
  confirmLabel,
}: {
  label: string;
  description: string;
  disabled?: boolean;
  onConfirm: () => void;
  confirmLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const theme = useTheme();
  const trigger = useRef<ComponentRef<typeof View>>(null);
  const cancel = useRef<ComponentRef<typeof View>>(null);
  const wasOpen = useRef(false);
  function focus(target: ComponentRef<typeof View> | null) {
    target?.focus();
    if (target && Platform.OS !== 'web') AccessibilityInfo.sendAccessibilityEvent(target, 'focus');
  }
  useEffect(() => {
    if (!open && wasOpen.current && Platform.OS !== 'ios') focus(trigger.current);
    wasOpen.current = open;
  }, [open]);
  return (
    <>
      <Action ref={trigger} label={label} disabled={disabled} onPress={() => setOpen(true)} />
      <Modal
        visible={open}
        transparent
        animationType="none"
        onRequestClose={() => setOpen(false)}
        onShow={() => focus(cancel.current)}
        onDismiss={() => focus(trigger.current)}
      >
        <SafeAreaProvider>
          <SafeAreaView
            accessibilityViewIsModal
            style={{
              flex: 1,
              justifyContent: 'center',
              padding: theme.spacing.large,
              backgroundColor: theme.tokens.overlay,
            }}
          >
            <ScrollView
              keyboardShouldPersistTaps="handled"
              style={{
                maxHeight: '85%',
                width: '100%',
                maxWidth: parseFloat(theme.tokens['dialog-compact-width']),
                alignSelf: 'center',
                flexGrow: 0,
                borderRadius: theme.radius,
                backgroundColor: theme.colors.card,
              }}
              contentContainerStyle={{
                gap: theme.spacing.medium,
                padding: theme.spacing.large,
                borderRadius: theme.radius,
                backgroundColor: theme.colors.card,
              }}
            >
              <Text
                accessibilityRole="header"
                style={{ fontSize: parseFloat(theme.tokens['font-heading']), fontWeight: '600' }}
              >
                {label}?
              </Text>
              <Text>{description}</Text>
              <Action
                ref={cancel}
                variant="outline"
                label="Cancel"
                onPress={() => setOpen(false)}
              />
              <Action
                variant="destructive"
                label={confirmLabel}
                disabled={disabled}
                onPress={() => {
                  setOpen(false);
                  onConfirm();
                }}
              />
            </ScrollView>
          </SafeAreaView>
        </SafeAreaProvider>
      </Modal>
    </>
  );
}
