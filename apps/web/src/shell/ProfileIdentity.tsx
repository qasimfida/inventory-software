import { Hint } from '@/components/ui/Tooltip';
/** The identity API provides email, not a display name or avatar photograph. */
export function ProfileIdentity({
  email,
  role,
  compact = false,
}: {
  email: string;
  role: string;
  compact?: boolean;
}) {
  const name = email.split('@')[0] || 'My account';
  return (
    <span className="profile-identity">
      <span className="profile-avatar" aria-hidden="true">
        {name.slice(0, 2).toUpperCase()}
      </span>
      {!compact && (
        <span className="profile-copy">
          <Hint label={email}>
            <span>{name}</span>
          </Hint>
          <span className="profile-role">{role.replaceAll('_', ' ')}</span>
        </span>
      )}
    </span>
  );
}
