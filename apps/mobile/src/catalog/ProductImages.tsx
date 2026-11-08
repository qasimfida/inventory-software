import * as ImagePicker from 'expo-image-picker';
import { useRef, useState } from 'react';
import { PRODUCT_IMAGE_MAX_BYTES } from '@inventory/contracts';
import type { ProductImageUpload } from '@inventory/contracts';
import { Image, View } from 'react-native';
import { productSchema } from '@inventory/contracts';
import { Text } from '../ui/Themed';
import { Action, Field } from '../ui/Controls';
import { useTheme } from '../theme';
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
    <View>
      <Text>
        Up to five images. The first is primary. Uploaded photos are public assets available to
        anyone with their link; do not upload sensitive information.
      </Text>
      {upload && (
        <Action
          label="Upload product image"
          disabled={disabled || uploading || (replacing === null && value.length >= 5)}
          onPress={() =>
            void uploadFile(async () => {
              const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['images'],
                base64: true,
                quality: 0.5,
              });
              if (result.canceled) return null;
              const asset = result.assets[0];
              if (
                !asset?.base64 ||
                (asset.fileSize ?? asset.base64.length * 0.75) > PRODUCT_IMAGE_MAX_BYTES ||
                !['image/png', 'image/jpeg', 'image/webp'].includes(asset.mimeType ?? '')
              )
                throw new Error('Invalid image');
              return { mime: asset.mimeType as ProductImageUpload['mime'], base64: asset.base64 };
            })
          }
        />
      )}
      {uploading && (
        <Text accessibilityLiveRegion="polite">Uploading image… Keep this editor open.</Text>
      )}
      {value.map((url, index) => (
        <View key={`${index}-${url}`}>
          <ImagePreview url={url} index={index} />
          <Text>
            Image {index + 1}
            {index === 0 ? ' · Primary' : ''}
          </Text>
          <Action
            label={`Replace image ${index + 1}`}
            disabled={disabled || uploading}
            onPress={() => {
              setReplacing(index);
              setDraft(url);
              setError('');
            }}
          />
          <Action
            label={`Remove image ${index + 1}`}
            disabled={disabled || uploading}
            onPress={() => {
              onChange([...value.slice(0, index), ...value.slice(index + 1)]);
              setReplacing(null);
              setDraft('');
            }}
          />
          {index > 0 && (
            <Action
              label={`Move image ${index + 1} earlier`}
              disabled={disabled || uploading}
              onPress={() => {
                const next = [...value];
                [next[index - 1], next[index]] = [next[index]!, next[index - 1]!];
                onChange(next);
                setReplacing(null);
                setDraft('');
              }}
            />
          )}
        </View>
      ))}
      <Field
        label={replacing === null ? 'Image HTTPS URL' : `Replace image ${replacing + 1} URL`}
        value={draft}
        onChange={(v) => {
          setDraft(v);
          setError('');
        }}
        disabled={disabled || uploading}
        error={error}
        maxLength={500}
      />
      <Action
        label={replacing === null ? 'Add image URL' : 'Replace image'}
        disabled={
          disabled || uploading || !draft.trim() || (replacing === null && value.length >= 5)
        }
        onPress={apply}
      />
      {replacing !== null && (
        <Action
          label="Cancel replacement"
          disabled={disabled || uploading}
          onPress={() => {
            setReplacing(null);
            setDraft('');
            setError('');
          }}
        />
      )}
    </View>
  );
}
function ImagePreview({ url, index }: { url: string; index: number }) {
  const [failed, setFailed] = useState(false);
  const theme = useTheme();
  return !failed && productSchema.shape.images.safeParse([url]).success ? (
    <Image
      source={{ uri: url }}
      accessibilityLabel={`Product image ${index + 1}`}
      resizeMode="contain"
      style={{
        width: theme.spacing.large * 3,
        height: theme.spacing.large * 3,
        borderRadius: theme.radius,
      }}
      onError={() => setFailed(true)}
    />
  ) : (
    <Text>Image unavailable</Text>
  );
}
