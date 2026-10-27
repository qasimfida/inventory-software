import {
  onlineResultMessage,
  onlineResultTone,
  canReviewOnlineResult,
} from '@inventory/api-client';
import type { OnlineClient } from '@inventory/api-client';
import { View } from 'react-native';
import { SidePanel } from '../ui/SidePanel';
import { Text } from '../ui/Themed';
import { Action } from '../ui/Controls';
import { NativeIcon } from '../ui/NativeIcon';
import { useTheme } from '../theme';
export function OnlineBulkResult({
  result,
  onClose,
  onOpen,
  onTab,
}: {
  result: Awaited<ReturnType<OnlineClient['command']>>;
  onClose: () => void;
  onOpen: (id: string) => void;
  onTab: (tab: 'ready' | 'changes-required') => void;
}) {
  const theme = useTheme();
  return (
    <SidePanel title="Product results" open onClose={onClose}>
      <Text>Your request has been processed. Review any products that need attention.</Text>
      {(['success', 'warning', 'error'] as const).map((tone) => {
        const items = result.items.filter((i) => onlineResultTone(i) === tone);
        return (
          <View key={tone} style={{ gap: theme.spacing.small }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.small }}>
              <NativeIcon
                name={tone === 'success' ? '✓' : tone === 'warning' ? '⚠' : '×'}
                color={tone === 'error' ? theme.colors.error : theme.tokens[tone]}
              />
              <Text accessibilityRole="header">
                {tone === 'success'
                  ? 'Successful products'
                  : tone === 'warning'
                    ? 'Products with warnings'
                    : 'Failed products'}{' '}
                ({items.length})
              </Text>
            </View>
            {items.map((r, index) => (
              <View key={r.id + index}>
                <Text>{onlineResultMessage(r.code)}</Text>
                {canReviewOnlineResult(r.code) && (
                  <Action
                    variant="ghost"
                    label={
                      tone === 'warning'
                        ? 'Review product issues'
                        : tone === 'error'
                          ? 'Review product status'
                          : 'View product'
                    }
                    onPress={() => onOpen(r.id)}
                  />
                )}
              </View>
            ))}
          </View>
        );
      })}
      <Action label="Review changes required" onPress={() => onTab('changes-required')} />
      <Action label="View ready products" onPress={() => onTab('ready')} />
    </SidePanel>
  );
}
