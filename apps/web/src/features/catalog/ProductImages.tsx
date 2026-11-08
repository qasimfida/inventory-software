import { useRef, useState } from 'react';
import { PRODUCT_IMAGE_MAX_BYTES } from '@inventory/contracts';
import type { ProductImageUpload } from '@inventory/contracts';
import { productSchema } from '@inventory/contracts';
import { Input } from '@/components/ui/FormControls';
import { Button } from '@/components/ui/Button';
/** Image editing; failed previews never discard the saved URL or other draft fields. */
export function ProductImages({
  value,
  onChange,
  disabled = false,
  upload,
  onBusyChange,
}: {
  value: string[];
  onChange: (value: string[]) => void;
  disabled?: boolean;
  upload?: (input: ProductImageUpload) => Promise<{ url: string }>;
  onBusyChange?: (busy: boolean) => void;
}) {
  const busy = useRef(false);
  const [uploading, setUploading] = useState(false);
  const uploadFile = async (choose: () => Promise<ProductImageUpload | null>) => {
    if (busy.current || !upload || disabled || (replacing === null && value.length >= 5)) return;
    busy.current = true;
    setUploading(true);
    onBusyChange?.(true);
    setError('');
    try {
      const input = await choose();
      if (!input) return;
      const result = await upload(input);
      const next = [...value];
      if (replacing === null) next.push(result.url);
      else next[replacing] = result.url;
      onChange(next);
      setReplacing(null);
      setDraft('');
    } catch {
      setError(
        'Image upload failed. Choose a PNG, JPEG or WebP up to 512 KB and check your connection. If this continues, ask your administrator to check image storage. Your other details are unchanged.',
      );
    } finally {
      busy.current = false;
      setUploading(false);
      onBusyChange?.(false);
    }
  };
  const [draft, setDraft] = useState('');
  const [error, setError] = useState('');
  const [replacing, setReplacing] = useState<number | null>(null);
  const apply = () => {
    const next = [...value];
    if (replacing === null) next.push(draft.trim());
    else next[replacing] = draft.trim();
    const parsed = productSchema.shape.images.safeParse(next);
    if (!parsed.success) {
      setError(
        'Use an HTTPS image URL without credentials, up to 500 characters. Maximum five images.',
      );
      return;
    }
    onChange(parsed.data);
    setDraft('');
    setReplacing(null);
    setError('');
  };
  return (
    <div className="space-y-2">
      <p>
        Up to five images. The first is primary. Uploaded photos are public assets available to
        anyone with their link; do not upload sensitive information.
      </p>
      {upload && (
        <>
          <label htmlFor="product-image-file">
            Upload product image (PNG, JPEG or WebP; maximum 512 KB)
          </label>
          <Input
            id="product-image-file"
            type="file"
            accept="image/png,image/jpeg,image/webp"
            disabled={disabled || uploading || (replacing === null && value.length >= 5)}
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = '';
              if (!file) return;
              void uploadFile(async () => {
                if (
                  file.size > PRODUCT_IMAGE_MAX_BYTES ||
                  !['image/png', 'image/jpeg', 'image/webp'].includes(file.type)
                )
                  throw new Error('Invalid image');
                const data = await new Promise<string>((resolve, reject) => {
                  const reader = new FileReader();
                  reader.onload = () => resolve(String(reader.result));
                  reader.onerror = () => reject(new Error('Read failed'));
                  reader.readAsDataURL(file);
                });
                return {
                  mime: file.type as ProductImageUpload['mime'],
                  base64: data.slice(data.indexOf(',') + 1),
                };
              });
            }}
          />
        </>
      )}
      {uploading && <p role="status">Uploading image… Keep this editor open.</p>}
      {value.map((url, index) => (
        <div key={`${index}-${url}`} className="flex flex-wrap items-center gap-2">
          <ImagePreview url={url} index={index} />
          <span>
            Image {index + 1}
            {index === 0 ? ' · Primary' : ''}
          </span>
          <Button
            type="button"
            variant="ghost"
            disabled={disabled || uploading}
            onClick={() => {
              setReplacing(index);
              setDraft(url);
              setError('');
            }}
          >
            Replace image {index + 1}
          </Button>
          <Button
            type="button"
            variant="ghost"
            disabled={disabled || uploading}
            onClick={() => {
              onChange([...value.slice(0, index), ...value.slice(index + 1)]);
              setReplacing(null);
              setDraft('');
            }}
          >
            Remove image {index + 1}
          </Button>
          {index > 0 && (
            <Button
              type="button"
              variant="ghost"
              disabled={disabled || uploading}
              onClick={() => {
                const next = [...value];
                [next[index - 1], next[index]] = [next[index]!, next[index - 1]!];
                onChange(next);
                setReplacing(null);
                setDraft('');
              }}
            >
              Move image {index + 1} earlier
            </Button>
          )}
        </div>
      ))}
      <label htmlFor="product-image-url">
        {replacing === null ? 'Image HTTPS URL' : `Replace image ${replacing + 1} URL`}
      </label>
      <Input
        id="product-image-url"
        value={draft}
        disabled={disabled || uploading}
        maxLength={500}
        aria-invalid={!!error}
        aria-describedby={error ? 'product-image-error' : undefined}
        onChange={(e) => {
          setDraft(e.target.value);
          setError('');
        }}
      />
      {error && (
        <p id="product-image-error" role="alert">
          {error}
        </p>
      )}
      <Button
        type="button"
        variant="outline"
        disabled={
          disabled || uploading || !draft.trim() || (replacing === null && value.length >= 5)
        }
        onClick={apply}
      >
        {replacing === null ? 'Add image URL' : 'Replace image'}
      </Button>
      {replacing !== null && (
        <Button
          type="button"
          variant="ghost"
          disabled={disabled || uploading}
          onClick={() => {
            setReplacing(null);
            setDraft('');
            setError('');
          }}
        >
          Cancel replacement
        </Button>
      )}
    </div>
  );
}
function ImagePreview({ url, index }: { url: string; index: number }) {
  const [failed, setFailed] = useState(false);
  return !failed && productSchema.shape.images.safeParse([url]).success ? (
    <img
      src={url}
      alt={`Product preview ${index + 1}`}
      className="h-20 w-20 rounded-md bg-muted object-contain"
      referrerPolicy="no-referrer"
      loading="lazy"
      onError={() => setFailed(true)}
    />
  ) : (
    <span role="img" aria-label={`Image ${index + 1} unavailable`}>
      Image unavailable
    </span>
  );
}
