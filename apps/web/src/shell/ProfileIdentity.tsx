import { Hint } from '@/components/ui/Tooltip';
/** Shared account/workspace identity; company branding is supplied explicitly. */
export function ProfileIdentity({
  email,
  role,
  compact = false,
  displayName,
  logo,
}: {
  email: string;
  role: string;
  compact?: boolean;
  displayName?: string;
  logo?: string;
}) {
  const name = displayName ?? (email.split('@')[0] || 'My account');
  return (
    <span className="profile-identity">
      <span className="profile-avatar" aria-hidden="true">
        {logo ? (
          <img src={logo} alt="" className="size-full object-contain" />
        ) : (
          name.slice(0, 2).toUpperCase()
        )}
      </span>
      {!compact && (
        <span className="profile-copy">
          <Hint label={displayName ?? email}>
            <span>{name}</span>
          </Hint>
          <span className="profile-role">{role.replaceAll('_', ' ')}</span>
        </span>
      )}
    </span>
  );
}
