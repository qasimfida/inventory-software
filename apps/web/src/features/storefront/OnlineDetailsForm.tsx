import { overridePreview, onlinePrice } from '@inventory/api-client';
import type { OnlineClient } from '@inventory/api-client';
import { allowedImageUrl } from '@inventory/contracts';
import type { OnlineOverrides, OnlineProductPreview } from '@inventory/contracts';
import { Input, Textarea } from '@/components/ui/FormControls';
import { Button } from '@/components/ui/Button';
import { Checkbox } from '@/components/ui/Checkbox';
import { Switch } from '@/components/ui/Switch';
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
  let live = preview;
  try {
    live = overridePreview(preview, value);
  } catch {
    /* An incomplete numeric input remains editable; server validation is authoritative. */
  }
  const selected = value.images ?? preview.inherited.images;
  return (
    <div className="space-y-4">
      <label>
        Online title <small>{value.title === null ? 'Inherited' : 'Override'}</small>
        <Input
          disabled={disabled}
          value={value.title ?? preview.inherited.title}
          maxLength={120}
          onChange={(e) => onChange({ ...value, title: e.target.value })}
        />
      </label>
      <label>
        Online description <small>{value.description === null ? 'Inherited' : 'Override'}</small>
        <Textarea
          disabled={disabled}
          value={value.description ?? preview.inherited.description}
          maxLength={2000}
          onChange={(e) => onChange({ ...value, description: e.target.value })}
        />
      </label>
      <fieldset disabled={disabled}>
        <legend>Product images — selected order</legend>
        {preview.images.map((url) => (
          <div key={url} className="flex flex-wrap items-center gap-2">
            <Checkbox
              aria-label={`Use image ${url}`}
              checked={selected.includes(url)}
              disabled={
                disabled ||
                (!selected.includes(url) && !allowedImageUrl(url, preview.source.allowedHosts))
              }
              onCheckedChange={(checked) =>
                onChange({
                  ...value,
                  images: checked ? [...selected, url] : selected.filter((v) => v !== url),
                })
              }
            />
            <span className="min-w-0 break-all">{url}</span>
            {selected.includes(url) && (
              <Button
                variant="ghost"
                size="sm"
                disabled={disabled || selected.indexOf(url) === 0}
                onClick={() => {
                  const next = [...selected],
                    i = next.indexOf(url);
                  [next[i - 1], next[i]] = [next[i]!, next[i - 1]!];
                  onChange({ ...value, images: next });
                }}
              >
                Move earlier ({selected.indexOf(url) + 1})
              </Button>
            )}
            {!allowedImageUrl(url, preview.source.allowedHosts) && <span>Source not allowed</span>}
          </div>
        ))}
      </fieldset>
      <Switch
        label="Use an online price override"
        checked={value.price !== null}
        disabled={disabled}
        onCheckedChange={(enabled) =>
          onChange({
            ...value,
            price: enabled ? { unitPrice: '', currency: preview.source.currency } : null,
          })
        }
      />
      {value.price && (
        <label>
          Online unit price ({preview.source.currency})
          <Input
            inputMode="decimal"
            disabled={disabled}
            value={value.price.unitPrice}
            onChange={(e) =>
              onChange({
                ...value,
                price: { unitPrice: e.target.value, currency: preview.source.currency },
              })
            }
          />
        </label>
      )}
      <Switch
        label="Visible online when published"
        checked={value.visible}
        disabled={disabled}
        onCheckedChange={(visible) => onChange({ ...value, visible })}
      />
      <Button
        variant="outline"
        disabled={disabled}
        onClick={() =>
          onChange({ title: null, description: null, images: null, price: null, visible: true })
        }
      >
        Reset to product values
      </Button>
      <section aria-label="Storefront card preview" className="rounded-lg border bg-card p-4">
        <OnlineProductImage
          client={client}
          {...(live.source.images[0] ? { url: live.source.images[0] } : {})}
          title={live.title}
        />
        <h3>{live.title}</h3>
        <p className="text-muted-foreground">
          Draft preview. The server recalculates prices and taxes on save and publication.
        </p>
        <p>{live.source.description}</p>
        <p>{onlinePrice(live)}</p>
        <p>{live.source.soldOut ? 'Sold out' : 'In stock'} · Preview only</p>
      </section>
      <ul aria-label="Readiness preview" className="space-y-2">
        {live.issues.map((i, n) => (
          <li key={i.code + n}>
            {i.severity === 'error' ? '!' : '△'} {i.message}
          </li>
        ))}
      </ul>
    </div>
  );
}
