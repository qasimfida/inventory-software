import { TransactionFields } from './TransactionFields';
import { useState, useSyncExternalStore } from 'react';
import { Image, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { companyProfileSchema, hasPermission } from '@inventory/contracts';
import type { Business, CompanyProfile as Profile, PolicyRecord } from '@inventory/contracts';
import { companyFields } from '@inventory/api-client';
import { settingsModel } from './model';
import { Field, Action } from '../ui/Controls';
import { Text } from '../ui/Themed';
import { useTheme } from '../theme';
export function CompanyProfile({ business }: { business: Business }) {
  const state = useSyncExternalStore(settingsModel.subscribe, settingsModel.snapshot);
  if (!state.business || state.businessId !== business.id) return null;
  return (
    <ProfileForm
      key={`${business.id}-${state.business.version}`}
      policy={state.business}
      editable={hasPermission(business, 'business.write')}
    />
  );
}
function ProfileForm({ policy, editable }: { policy: PolicyRecord; editable: boolean }) {
  const theme = useTheme(),
    state = useSyncExternalStore(settingsModel.subscribe, settingsModel.snapshot);
  const [profile, setProfile] = useState<Profile>(() =>
      companyProfileSchema.parse(policy.values.company ?? {}),
    ),
    [error, setError] = useState('');
  const disabled = !editable || state.busy;
  async function logo() {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        base64: true,
        quality: 0.5,
      });
      if (result.canceled) return;
      const item = result.assets[0];
      const candidate = `data:${item?.mimeType ?? 'image/jpeg'};base64,${item?.base64 ?? ''}`;
      const parsed = companyProfileSchema.shape.logo.safeParse(candidate);
      if (!parsed.success) {
        setError('Choose a PNG, JPEG or WebP logo smaller than 60 KB.');
        return;
      }
      setProfile({ ...profile, logo: parsed.data });
      setError('');
    } catch {
      setError('Photo selection is unavailable. Retry on a supported device.');
    }
  }
  return (
    <View style={{ gap: theme.spacing.medium }}>
      <Text accessibilityRole="header">Company profile</Text>
      <Text>
        Business contact details and logo. Manage your personal appearance in Preferences.
      </Text>
      {!!(error || state.message) && (
        <Text accessibilityRole="alert">{error || state.message}</Text>
      )}
      <TransactionFields profile={profile} onChange={setProfile} disabled={disabled} />
      {!!profile.logo && (
        <Image
          accessibilityLabel="Company logo"
          source={{ uri: profile.logo }}
          style={{ width: theme.spacing.large * 3, height: theme.spacing.large * 3 }}
          resizeMode="contain"
        />
      )}
      <Action label="Choose company logo" disabled={disabled} onPress={() => void logo()} />
      <Action
        label="Remove logo"
        disabled={disabled || !profile.logo}
        onPress={() => setProfile({ ...profile, logo: '' })}
      />
      {companyFields.map((field) => (
        <Field
          key={field.key}
          label={field.label}
          value={profile[field.key]}
          maxLength={field.max}
          disabled={disabled}
          multiline={field.key === 'address' || field.key === 'description'}
          onChange={(value) => setProfile({ ...profile, [field.key]: value })}
        />
      ))}
      {editable && (
        <Action
          label="Save company profile"
          disabled={state.busy}
          onPress={() => {
            const parsed = companyProfileSchema.safeParse(profile);
            if (!parsed.success) {
              setError(
                parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join(' · '),
              );
              return;
            }
            setError('');
            void settingsModel.policy(
              {
                version: policy.version,
                values: {
                  ...policy.values,
                  company: parsed.data,
                },
              },
              false,
            );
          }}
        />
      )}
    </View>
  );
}
