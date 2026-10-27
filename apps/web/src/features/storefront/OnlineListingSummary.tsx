import { StatusBadge } from '@/components/ui/StatusBadge';
import { hasPermission } from '@inventory/contracts';
import type { Business, OnlineProductDetail } from '@inventory/contracts';
import { onlineFieldLabel, onlineStatus, onlinePrice } from '@inventory/api-client';
import type { OnlineClient } from '@inventory/api-client';
import { Button } from '@/components/ui/Button';
import { OnlineProductImage } from './OnlineProductImage';
export function OnlineListingSummary({
  business,
  detail,
  client,
  disabled,
  fix,
  edit,
  history,
  action,
}: {
  business: Business;
  detail: OnlineProductDetail;
  client: OnlineClient;
  disabled: boolean;
  fix: (field: string) => void;
  edit: () => void;
  history: () => void;
  action: (a: 'publish' | 'pause' | 'resume' | 'remove') => void;
}) {
  const { listing: l, preview: p } = detail,
    manage = hasPermission(business, 'onlineStore.manage'),
    catalog = manage && hasPermission(business, 'products.write') && p.source.state !== 'archived';
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <OnlineProductImage
          client={client}
          title={l.title}
          {...(p.source.images[0] ? { url: p.source.images[0] } : {})}
        />
        <div>
          <h3>{l.title}</h3>
          <StatusBadge>{onlineStatus(l, p)}</StatusBadge>
          <p>
            {onlinePrice(p)} · {p.quantity} available
          </p>
        </div>
      </div>
      {(['error', 'warning'] as const).map((severity) => (
        <section key={severity}>
          <h4>{severity === 'error' ? 'Needs fixing' : 'Warnings'}</h4>
          {l.issues.filter((i) => i.severity === severity).length ? (
            <ul className="space-y-2">
              {l.issues
                .filter((i) => i.severity === severity)
                .map((i, n) => (
                  <li key={i.code + n}>
                    <p>{i.message}</p>
                    {manage && (
                      <Button
                        size="sm"
                        variant="link"
                        disabled={disabled || !catalog}
                        onClick={() =>
                          fix(i.code === 'IMAGE_HOST_NOT_ALLOWED' ? 'allowedImageHosts' : i.field)
                        }
                      >
                        Fix {onlineFieldLabel(i.field)}
                      </Button>
                    )}
                  </li>
                ))}
            </ul>
          ) : (
            <p className="text-muted-foreground">None</p>
          )}
        </section>
      ))}
      {p.source.state === 'archived' && (
        <p>
          Archived products cannot be reactivated under the catalog's irreversible archival policy.
          Remove this listing and select an active replacement.
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" disabled={disabled || !catalog} onClick={() => fix('title')}>
          Edit product
        </Button>
        {!catalog && p.source.state !== 'archived' && (
          <p>Catalog edit and online store management permissions are required.</p>
        )}
        {manage && (
          <>
            <Button disabled={disabled} onClick={edit}>
              Edit online details
            </Button>
            {l.status === 'ready' && (
              <Button disabled={disabled} onClick={() => action('publish')}>
                Publish
              </Button>
            )}
            {l.status === 'active' && (
              <Button disabled={disabled} onClick={() => action('pause')}>
                Pause
              </Button>
            )}
            {l.status === 'paused' && (
              <Button disabled={disabled} onClick={() => action('resume')}>
                Resume
              </Button>
            )}
            {catalog && p.source.state !== 'active' && (
              <Button disabled={disabled} onClick={() => fix('state')}>
                Reactivate product
              </Button>
            )}
            <Button variant="destructive" disabled={disabled} onClick={() => action('remove')}>
              Remove from store
            </Button>
          </>
        )}
        <Button variant="ghost" onClick={history}>
          View history
        </Button>
      </div>
    </div>
  );
}
