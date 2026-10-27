import { useEffect, useState } from 'react';
import { Image } from 'react-native';
import type { OnlineClient } from '@inventory/api-client';
import { Text } from '../ui/Themed';
import { useTheme } from '../theme';
export function OnlineProductImage({
  client,
  url,
  title,
}: {
  client: OnlineClient;
  url?: string;
  title: string;
}) {
  const theme = useTheme(),
    [data, setData] = useState('');
  const [resolvedUrl, setResolvedUrl] = useState<string>();
  useEffect(() => {
    let active = true;
    if (url)
      void client
        .imagePreview(url)
        .then((r) => {
          if (active) {
            setData(r.dataUrl ?? '');
            setResolvedUrl(url);
          }
        })
        .catch(() => {});
    return () => {
      active = false;
    };
  }, [client, url]);
  return data && resolvedUrl === url ? (
    <Image
      source={{ uri: data }}
      accessibilityLabel={title}
      style={{
        width: theme.spacing.large * 3,
        height: theme.spacing.large * 3,
        borderRadius: theme.radius,
      }}
      resizeMode="contain"
      onError={() => setData('')}
    />
  ) : (
    <Text tone="muted">No image preview</Text>
  );
}
