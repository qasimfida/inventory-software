import { useState } from 'react';
import { storefrontHostSchema } from '@inventory/contracts';
import type { OnlineStoreSettings } from '@inventory/contracts';
import type { OnlineStoreModel } from '@inventory/api-client';
import { Input } from '@/components/ui/FormControls';
import { Button } from '@/components/ui/Button';
import { FormField } from '@/components/common/FormField';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/Dialog';
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
    <div className="space-y-5">
      <p>
        Allow exact public HTTPS hosts, for example images.example.com. URLs, paths, IP addresses,
        local hosts and wildcards are not accepted.
      </p>
      {dirty || !draft.version ? (
        <p role="status">Save settings before changing or testing image sources.</p>
      ) : null}
      <ul className="space-y-2">
        {draft.allowedImageHosts.map((value) => (
          <li key={value} className="flex flex-wrap items-center justify-between gap-2">
            <span>{value}</span>
            <Button
              variant="outline"
              disabled={disabled || busy || dirty}
              onClick={() => void inspect(value)}
            >
              Remove {value}
            </Button>
          </li>
        ))}
      </ul>
      <FormField label="Allowed image host">
        {(props) => (
          <Input
            {...props}
            disabled={disabled}
            value={host}
            onChange={(e) => setHost(e.target.value)}
            placeholder="images.example.com"
          />
        )}
      </FormField>
      <Button
        disabled={disabled || busy || dirty || !draft.version || !host.trim()}
        onClick={() => void add()}
      >
        Add image host
      </Button>
      <FormField
        label="Test an image URL"
        description="PNG, JPEG, WebP or GIF, up to 2 MB. Redirects and private network destinations are blocked."
      >
        {(props) => (
          <Input
            {...props}
            value={url}
            onChange={(e) => {
              setUrl(e.target.value);
              setPreview('');
            }}
          />
        )}
      </FormField>
      <Button
        variant="outline"
        disabled={disabled || busy || dirty || !draft.version || !url}
        onClick={() => void test()}
      >
        Test image
      </Button>
      {message && <p role="status">{message}</p>}
      {preview && (
        <img
          src={preview}
          alt="Online-store preview"
          onError={() => {
            setPreview('');
            setMessage(
              'The server returned data that could not be displayed. Choose another image URL.',
            );
          }}
          className="max-h-64 max-w-full rounded-(--surface-radius) object-contain"
        />
      )}
      <Dialog
        open={!!impact}
        onOpenChange={(open) => {
          if (!open) setImpact(null);
        }}
      >
        <DialogContent size="compact">
          <DialogTitle>Remove image source?</DialogTitle>
          <DialogDescription>
            {impact?.count} listings use images from {impact?.host} and will move to Changes
            required if this source is removed.
          </DialogDescription>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setImpact(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={disabled}
              onClick={() => {
                if (impact)
                  void model.execute({
                    action: 'remove-host',
                    host: impact.host,
                    version: draft.version,
                  });
                setImpact(null);
              }}
            >
              Remove source
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
