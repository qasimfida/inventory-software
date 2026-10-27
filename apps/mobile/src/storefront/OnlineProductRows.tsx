import { onlineFieldLabel, onlinePrice, onlineStatus } from '@inventory/api-client';
import type { OnlineClient } from '@inventory/api-client';
import { hasPermission } from '@inventory/contracts';
import type { Business, ChannelListing, OnlineProductPreview } from '@inventory/contracts';
import { View, useWindowDimensions } from 'react-native';
import { useState } from 'react';
import { useTheme } from '../theme';
import { Text } from '../ui/Themed';
import { Action } from '../ui/Controls';
import { IconAction } from '../ui/IconAction';
import { Checkbox } from '../ui/Checkbox';
import { SidePanel } from '../ui/SidePanel';
import { StatusBadge } from '../ui/StatusBadge';
import { OnlineProductImage } from './OnlineProductImage';
export function OnlineProductRows({
  items,
  previews,
  business,
  client,
  selected,
  disabled,
  toggle,
  selectAll,
  grid = false,
  open,
  setFix,
  setHistory,
  command,
}: {
  items: ChannelListing[];
  previews: Record<string, OnlineProductPreview>;
  business: Business;
  client: OnlineClient;
  selected: Map<string, ChannelListing>;
  disabled: boolean;
  toggle: (l: ChannelListing) => void;
  selectAll: () => void;
  grid?: boolean;
  open: (id: string) => void;
  setFix: (v: { listing: ChannelListing; field: string }) => void;
  setHistory: (id: string) => void;
  command: (
    action: 'publish' | 'pause' | 'resume' | 'remove' | 'validate',
    items: ChannelListing[],
  ) => Promise<void>;
}) {
  const theme = useTheme(),
    { width, fontScale } = useWindowDimensions(),
    manage = hasPermission(business, 'onlineStore.manage');
  const [issues, setIssues] = useState<ChannelListing | null>(null),
    [remove, setRemove] = useState<ChannelListing | null>(null);
  const columns = grid && width >= 600 && fontScale <= 1.3;
  return (
    <>
      {manage && items.length > 0 && (
        <Checkbox
          label="Select all products on this page"
          disabled={disabled}
          value={items.every((l) => selected.has(l.id))}
          onChange={selectAll}
        />
      )}
      <View
        style={{
          flexDirection: columns ? 'row' : 'column',
          flexWrap: 'wrap',
          gap: theme.spacing.small,
        }}
      >
        {items.map((l) => (
          <View
            key={l.id}
            style={{
              flexBasis: columns ? '48%' : undefined,
              flexGrow: 1,
              padding: theme.spacing.small,
              gap: theme.spacing.small,
              borderRadius: theme.radius,
              backgroundColor: theme.colors.card,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.small }}>
              <OnlineProductImage
                client={client}
                title={l.title}
                {...(previews[l.id]?.source.images[0]
                  ? { url: previews[l.id]!.source.images[0] }
                  : {})}
              />
              <View style={{ flex: 1 }}>
                <Action variant="ghost" label={l.title} onPress={() => open(l.id)} />
                <Text>
                  {previews[l.id] ? onlinePrice(previews[l.id]!) : 'Price unavailable'} ·{' '}
                  {previews[l.id]?.quantity ?? '—'} available
                </Text>
              </View>
              {manage && (
                <Checkbox
                  label={`Select ${l.title}`}
                  value={selected.has(l.id)}
                  disabled={disabled}
                  onChange={() => toggle(l)}
                />
              )}
            </View>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: theme.spacing.small,
              }}
            >
              <StatusBadge
                label={onlineStatus(l, previews[l.id])}
                tone={
                  l.status === 'active'
                    ? 'success'
                    : l.status === 'needs_changes'
                      ? 'warning'
                      : 'info'
                }
              />
              {!!l.issues.length && (
                <IconAction
                  label={`Product issues: ${l.issues.map((i) => i.message).join(' ')}`}
                  icon={l.issues.some((i) => i.severity === 'error') ? '!' : '⚠'}
                  onPress={() => setIssues(l)}
                />
              )}
              <IconAction label="Edit online details" icon="eye" onPress={() => open(l.id)} />
              <IconAction label="View history" icon="↶" onPress={() => setHistory(l.id)} />
              {manage && (
                <>
                  {l.status === 'ready' && (
                    <IconAction
                      label="Publish"
                      icon="↑"
                      disabled={disabled}
                      onPress={() => void command('publish', [l])}
                    />
                  )}
                  {l.status === 'active' && (
                    <IconAction
                      label="Pause"
                      icon="Ⅱ"
                      disabled={disabled}
                      onPress={() => void command('pause', [l])}
                    />
                  )}
                  {l.status === 'paused' && (
                    <IconAction
                      label="Resume"
                      icon="▷"
                      disabled={disabled}
                      onPress={() => void command('resume', [l])}
                    />
                  )}
                  {l.status === 'needs_changes' && (
                    <IconAction
                      label="Re-check"
                      icon="↻"
                      disabled={disabled}
                      onPress={() => void command('validate', [l])}
                    />
                  )}
                  <IconAction
                    label="Remove from store"
                    icon="trash"
                    disabled={disabled}
                    onPress={() => setRemove(l)}
                  />
                </>
              )}
            </View>
          </View>
        ))}
      </View>
      {issues && (
        <SidePanel title="Product issues" open onClose={() => setIssues(null)}>
          <Text accessibilityRole="header">{issues.title}</Text>
          {issues.issues.map((i, index) => (
            <View key={i.code + index}>
              <Text tone={i.severity === 'error' ? 'error' : 'warning'}>
                {i.severity === 'error' ? '!' : '⚠'} {i.message}
              </Text>
              {manage && hasPermission(business, 'products.write') && (
                <Action
                  variant="ghost"
                  label={
                    i.code === 'PRODUCT_ARCHIVED'
                      ? 'Archived — use a replacement'
                      : `Fix ${onlineFieldLabel(i.field)}`
                  }
                  disabled={disabled || i.code === 'PRODUCT_ARCHIVED'}
                  onPress={() => {
                    setFix({
                      listing: issues,
                      field: i.code === 'IMAGE_HOST_NOT_ALLOWED' ? 'allowedImageHosts' : i.field,
                    });
                    setIssues(null);
                  }}
                />
              )}
            </View>
          ))}
        </SidePanel>
      )}
      {remove && (
        <SidePanel title="Remove from online store?" open onClose={() => setRemove(null)}>
          <Text>Catalog products and stock will be kept.</Text>
          <Action label="Cancel" onPress={() => setRemove(null)} />
          <Action
            label="Confirm removal"
            variant="destructive"
            disabled={disabled}
            onPress={() => {
              void command('remove', [remove]);
              setRemove(null);
            }}
          />
        </SidePanel>
      )}
    </>
  );
}
