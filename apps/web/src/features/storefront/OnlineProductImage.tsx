import { useEffect, useState } from 'react';
import type { OnlineClient } from '@inventory/api-client';
import { Package } from 'lucide-react';
/** Uses the authenticated allowlisted raster proxy; never inserts an arbitrary remote URL. */
export function OnlineProductImage({
  client,
  url,
  title,
}: {
  client: OnlineClient;
  url?: string;
  title: string;
}) {
  const [data, setData] = useState('');
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
    <img
      className="size-16 rounded-md object-contain bg-muted"
      src={data}
      alt={title}
      onError={() => setData('')}
    />
  ) : (
    <Package aria-label="No preview available" className="size-10 text-muted-foreground" />
  );
}
