import { View } from 'react-native';
import { overridePreview, onlinePrice } from '@inventory/api-client';
import type { OnlineClient } from '@inventory/api-client';
import { allowedImageUrl } from '@inventory/contracts';
import type { OnlineOverrides, OnlineProductPreview } from '@inventory/contracts';
import { Field, Action } from '../ui/Controls';
import { Checkbox } from '../ui/Checkbox';
import { SettingSwitch } from '../ui/SettingSwitch';
import { Text } from '../ui/Themed';
import { useTheme } from '../theme';
import { OnlineProductImage } from './OnlineProductImage';
export function OnlineDetailsForm({
  preview,
  value,
  onChange,
  disabled,
  client,
}: {
  preview: OnlineProductPreview;
  value: OnlineOverrides;
  onChange: (v: OnlineOverrides) => void;
  disabled: boolean;
  client: OnlineClient;
}) {
  const theme = useTheme();
  let live = preview;
  try {
    live = overridePreview(preview, value);
  } catch {
    /* Invalid numeric drafts remain editable. */
  }
  const selected = value.images ?? preview.inherited.images;
  return (
    <View style={{ gap: theme.spacing.medium }}>
      <Field
        label={`Online title (${value.title === null ? 'Inherited' : 'Override'})`}
        value={value.title ?? preview.inherited.title}
        disabled={disabled}
        maxLength={120}
        onChange={(title) => onChange({ ...value, title })}
      />
      <Field
        label={`Online description (${value.description === null ? 'Inherited' : 'Override'})`}
        value={value.description ?? preview.inherited.description}
        disabled={disabled}
        multiline
        maxLength={2000}
        onChange={(description) => onChange({ ...value, description })}
      />
      <Text accessibilityRole="header">Product images — selected order</Text>
      {preview.images.map((url) => (
        <View key={url}>
          <Checkbox
            label={url}
            value={selected.includes(url)}
            disabled={
              disabled ||
              (!selected.includes(url) && !allowedImageUrl(url, preview.source.allowedHosts))
            }
            onChange={(checked) =>
              onChange({
                ...value,
                images: checked ? [...selected, url] : selected.filter((v) => v !== url),
              })
            }
          />
          {selected.includes(url) && (
            <Action
              label={`Move earlier (${selected.indexOf(url) + 1})`}
              disabled={disabled || selected.indexOf(url) === 0}
              onPress={() => {
                const next = [...selected],
                  i = next.indexOf(url);
                [next[i - 1], next[i]] = [next[i]!, next[i - 1]!];
                onChange({ ...value, images: next });
              }}
            />
          )}
          {!allowedImageUrl(url, preview.source.allowedHosts) && <Text>Source not allowed</Text>}
        </View>
      ))}
      <SettingSwitch
        label="Use an online price override"
        value={value.price !== null}
        disabled={disabled}
        onChange={(enabled) =>
          onChange({
            ...value,
            price: enabled ? { unitPrice: '', currency: preview.source.currency } : null,
          })
        }
      />
      {value.price && (
        <Field
          label={`Online unit price (${preview.source.currency})`}
          disabled={disabled}
          value={value.price.unitPrice}
          onChange={(unitPrice) =>
            onChange({ ...value, price: { unitPrice, currency: preview.source.currency } })
          }
        />
      )}
      <SettingSwitch
        label="Visible online when published"
        value={value.visible}
        disabled={disabled}
        onChange={(visible) => onChange({ ...value, visible })}
      />
      <Action
        label="Reset to product values"
        variant="outline"
        disabled={disabled}
        onPress={() =>
          onChange({ title: null, description: null, images: null, price: null, visible: true })
        }
      />
      <View
        style={{
          padding: theme.spacing.medium,
          borderRadius: theme.radius,
          backgroundColor: theme.colors.card,
        }}
      >
        <Text accessibilityRole="header">Storefront card preview</Text>
        <OnlineProductImage
          client={client}
          {...(live.source.images[0] ? { url: live.source.images[0] } : {})}
          title={live.title}
        />
        <Text>{live.title}</Text>
        <Text tone="muted">
          Draft preview. The server recalculates prices and taxes on save and publication.
        </Text>
        <Text>{live.source.description}</Text>
        <Text>{onlinePrice(live)}</Text>
        <Text>{live.source.soldOut ? 'Sold out' : 'In stock'} · Preview only</Text>
      </View>
      {live.issues.map((i, n) => (
        <Text key={i.code + n}>
          {i.severity === 'error' ? '!' : '△'} {i.message}
        </Text>
      ))}
    </View>
  );
}
