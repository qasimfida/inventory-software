import { useState } from 'react';
import { Image, View } from 'react-native';
import { storefrontHostSchema } from '@inventory/contracts';
import type { OnlineStoreSettings } from '@inventory/contracts';
import type { OnlineStoreModel } from '@inventory/api-client';
import { Field, Action } from '../ui/Controls';
import { Text } from '../ui/Themed';
import { ConfirmAction } from '../ui/ConfirmAction';
import { useTheme } from '../theme';
export function OnlineImageSources({
  model,
  draft,
  disabled,
  dirty,
}: {
  model: OnlineStoreModel;
  draft: OnlineStoreSettings;
  disabled: boolean;
  dirty: boolean;
}) {
  const theme = useTheme();
  const [host, setHost] = useState(''),
    [url, setUrl] = useState(''),
    [message, setMessage] = useState(''),
    [preview, setPreview] = useState(''),
    [busy, setBusy] = useState(false);
  const [impact, setImpact] = useState<{ host: string; count: number } | null>(null);
  async function add() {
    const parsed = storefrontHostSchema.safeParse(host.trim());
    if (!parsed.success) {
      setMessage(parsed.error.issues[0]!.message);
      return;
    }
    if (await model.execute({ action: 'add-host', host: parsed.data, version: draft.version }))
      setHost('');
  }
  async function inspect(host: string) {
    setBusy(true);
    setMessage('');
    try {
      setImpact(await model.client.hostImpact(host));
    } catch {
      setMessage('Unable to check affected listings. Retry before removing this host.');
    } finally {
      setBusy(false);
    }
  }
  async function test() {
    setBusy(true);
    setMessage('Checking image…');
    setPreview('');
    try {
      const result = await model.client.imagePreview(url);
      setMessage(result.message);
      setPreview(result.dataUrl ?? '');
    } catch {
      setMessage('Image check failed. Reconnect and retry.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <View style={{ gap: theme.spacing.medium }}>
      <Text>
        Allow exact public HTTPS hosts, for example images.example.com. URLs, paths, IP addresses,
        local hosts and wildcards are not accepted.
      </Text>
      {(dirty || !draft.version) && (
        <Text>Save settings before changing or testing image sources.</Text>
      )}
      {draft.allowedImageHosts.map((value) => (
        <Action
          key={value}
          variant="outline"
          label={`Review removal of ${value}`}
          disabled={disabled || busy || dirty}
          onPress={() => void inspect(value)}
        />
      ))}
      {impact && (
        <ConfirmAction
          label={`Remove ${impact.host}`}
          description={`${impact.count} listings use images from this host and will move to Changes required if it is removed.`}
          confirmLabel="Remove source"
          disabled={disabled || dirty}
          onConfirm={() => {
            void model.execute({
              action: 'remove-host',
              host: impact.host,
              version: draft.version,
            });
            setImpact(null);
          }}
        />
      )}
      <Field label="Allowed image host" disabled={disabled} value={host} onChange={setHost} />
      <Action
        label="Add image host"
        disabled={disabled || busy || dirty || !draft.version || !host.trim()}
        onPress={() => void add()}
      />
      <Field
        label="Test an image URL"
        description="PNG, JPEG, WebP or GIF, up to 2 MB. Redirects and private network destinations are blocked."
        value={url}
        onChange={(value) => {
          setUrl(value);
          setPreview('');
        }}
        maxLength={500}
      />
      <Action
        label="Test image"
        variant="outline"
        disabled={disabled || busy || dirty || !draft.version || !url}
        onPress={() => void test()}
      />
      {!!message && <Text accessibilityLiveRegion="polite">{message}</Text>}
      {!!preview && (
        <Image
          source={{ uri: preview }}
          accessibilityLabel="Tested online-store image"
          resizeMode="contain"
          onError={() => {
            setPreview('');
            setMessage(
              'The server returned data that could not be displayed. Choose another image URL.',
            );
          }}
          style={{ width: '100%', aspectRatio: 1, borderRadius: theme.radius }}
        />
      )}
    </View>
  );
}
