import { useState, useSyncExternalStore } from 'react';
import { companyProfileSchema, hasPermission } from '@inventory/contracts';
import type { Business, CompanyProfile as Profile, PolicyRecord } from '@inventory/contracts';
import { companyFields } from '@inventory/api-client';
import { settingsModel } from '@/platform/settings';
import { Input, Textarea } from '@/components/ui/FormControls';
import { Button } from '@/components/ui/Button';
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
  const [profile, setProfile] = useState<Profile>(() =>
    companyProfileSchema.parse(policy.values.company ?? {}),
  );
  const [error, setError] = useState('');
  const state = useSyncExternalStore(settingsModel.subscribe, settingsModel.snapshot);
  return (
    <form
      className="company-profile space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        const parsed = companyProfileSchema.safeParse(profile);
        if (!parsed.success) {
          setError(parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join(' · '));
          return;
        }
        setError('');
        void settingsModel.policy(
          {
            version: policy.version,
            values: {
              ...policy.values,
              company: parsed.data,
              defaults: { ...policy.values.defaults, accent: parsed.data.palette[0]! },
            },
          },
          false,
        );
      }}
    >
      <div>
        <h2>Company profile</h2>
        <p className="text-muted-foreground">
          Business contact and branding details. The first palette color is the business default;
          personal preferences remain respected.
        </p>
      </div>
      {(error || state.message) && <p role="alert">{error || state.message}</p>}
      <fieldset disabled={!editable || state.busy} className="space-y-4">
        <div className="company-logo-editor">
          {profile.logo && <img src={profile.logo} alt="Company logo" className="company-logo" />}
          <label htmlFor="company-logo">
            Company logo (PNG, JPEG or WebP, up to 60 KB)
            <Input
              id="company-logo"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                if (
                  file.size > 60000 ||
                  !['image/png', 'image/jpeg', 'image/webp'].includes(file.type)
                ) {
                  setError('Choose a PNG, JPEG or WebP smaller than 60 KB.');
                  return;
                }
                const reader = new FileReader();
                reader.onload = () => {
                  const logo = String(reader.result);
                  const parsed = companyProfileSchema.shape.logo.safeParse(logo);
                  if (parsed.success) {
                    setProfile((p) => ({ ...p, logo }));
                    setError('');
                  } else setError('The logo could not be read.');
                };
                reader.onerror = () => setError('The logo could not be read.');
                reader.readAsDataURL(file);
              }}
            />
          </label>
          <Button
            variant="ghost"
            disabled={!profile.logo}
            onClick={() => setProfile({ ...profile, logo: '' })}
          >
            Remove logo
          </Button>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {companyFields.map((field) => (
            <label key={field.key}>
              {field.label}
              {field.key === 'description' || field.key === 'address' ? (
                <Textarea
                  value={profile[field.key]}
                  maxLength={field.max}
                  onChange={(e) => setProfile({ ...profile, [field.key]: e.target.value })}
                />
              ) : (
                <Input
                  type={field.key === 'email' ? 'email' : field.key === 'website' ? 'url' : 'text'}
                  value={profile[field.key]}
                  maxLength={field.max}
                  onChange={(e) => setProfile({ ...profile, [field.key]: e.target.value })}
                />
              )}
            </label>
          ))}
        </div>
        <fieldset>
          <legend>Business palette</legend>
          <div className="compact-palette">
            {(['default', 'teal', 'violet', 'rose', 'amber'] as const).map((color) => (
              <button
                type="button"
                key={color}
                data-palette={color}
                aria-label={`Brand ${color}`}
                title={color}
                aria-pressed={profile.palette.includes(color)}
                onClick={() =>
                  setProfile({
                    ...profile,
                    palette: profile.palette.includes(color)
                      ? profile.palette.filter((c) => c !== color)
                      : [...profile.palette, color],
                  })
                }
              >
                {profile.palette.includes(color) ? '✓' : ''}
              </button>
            ))}
          </div>
        </fieldset>
        {editable && (
          <Button type="submit" disabled={state.busy}>
            Save company profile
          </Button>
        )}
      </fieldset>
      {!editable && <p>Only members with business management permission can edit this profile.</p>}
    </form>
  );
}
