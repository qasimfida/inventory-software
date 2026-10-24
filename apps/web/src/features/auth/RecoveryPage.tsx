import { useCallback, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { authAppLink, passwordGuidance } from '@inventory/api-client';
import { authClient } from '@/platform/auth-client';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/FormControls';
import { lockOffline } from '../offline/offline-lock';
import { AuthLayout } from './AuthLayout';
import { PasswordInput } from './PasswordInput';
import { useAccount } from '@/shell/SessionContext';
import { pendingAuthLink } from './link-state';
export function RecoveryPage() {
  const { run } = useAccount();
  const path = useLocation().pathname,
    navigate = useNavigate();
  const [link] = useState(pendingAuthLink.get());
  const [email, setEmail] = useState(link?.email ?? ''),
    [token, setToken] = useState(link?.token ?? '');
  const [password, setPassword] = useState(''),
    [confirmation, setConfirmation] = useState('');
  const [status, setStatus] = useState(''),
    [valid, setValid] = useState(false),
    [busy, setBusy] = useState(link?.kind === 'reset' && path === '/auth/reset');
  const verify = useCallback(
    (email: string, token: string) =>
      authClient
        .recoveryStatus(email, token)
        .then(() => {
          setValid(true);
          setStatus('Invitation verified. Choose your new password.');
        })
        .catch(() => {
          setValid(false);
          setStatus(
            'This invitation is invalid, expired, already used, or could not be verified. Request a new code from your trusted operator, or retry when connected.',
          );
        })
        .finally(() => setBusy(false)),
    [],
  );
  const check = () => {
    setBusy(true);
    setValid(false);
    setStatus('Checking recovery invitation…');
    return verify(email, token);
  };
  useEffect(() => {
    if (path === '/auth/reset' && link?.kind === 'reset') void verify(link.email, link.token);
  }, [path, link, verify]);
  if (path === '/auth/link')
    return (
      <AuthLayout title="Open your invitation" back>
        {link ? (
          <>
            <p>Continue securely in the installed application or this browser.</p>
            <a
              className="shell-nav-link bg-primary text-primary-foreground"
              href={authAppLink(link)}
            >
              Open in app
            </a>
            <Button
              onClick={() => {
                void navigate(`/auth/${link.kind}`);
              }}
            >
              Continue in browser
            </Button>
          </>
        ) : (
          <p role="alert">
            This link is incomplete or invalid. Ask your trusted operator for a new invitation.
          </p>
        )}
      </AuthLayout>
    );
  if (path === '/auth/forgot')
    return (
      <AuthLayout title="Recover your account" back>
        <p>
          Contact your trusted organization operator. After verifying your identity, they can issue
          a recovery invitation valid for 30 minutes.
        </p>
        <p className="text-sm text-muted-foreground">
          Automatic admin notification and email delivery are not configured. No request has been
          sent.
        </p>
        <Link className="text-primary underline" to="/auth/reset">
          I have a recovery invitation
        </Link>
      </AuthLayout>
    );
  return (
    <AuthLayout title="Reset password" back>
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (!valid) {
            void check();
            return;
          }
          if (password !== confirmation) {
            setStatus('Passwords do not match.');
            return;
          }
          setBusy(true);
          void authClient
            .resetPassword(email, password, token)
            .then(async () => {
              lockOffline();
              pendingAuthLink.clear();
              setToken('');
              setPassword('');
              setConfirmation('');
              await run(async () => null);
              void navigate('/auth/login', { replace: true, state: { passwordReset: true } });
            })
            .catch(() =>
              setStatus(
                'Reset could not be confirmed. If the response was interrupted, try signing in with your new password before requesting another invitation.',
              ),
            )
            .finally(() => setBusy(false));
        }}
      >
        <label htmlFor="recovery-email">Recovery account email</label>
        <Input
          id="recovery-email"
          type="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            setValid(false);
          }}
          required
          disabled={busy}
          autoComplete="username"
        />
        <label htmlFor="recovery-code">Recovery code</label>
        <Input
          id="recovery-code"
          type="password"
          value={token}
          onChange={(e) => {
            setToken(e.target.value);
            setValid(false);
          }}
          required
          minLength={43}
          maxLength={43}
          autoComplete="off"
          disabled={busy}
        />
        {valid && (
          <>
            <label htmlFor="new-password">New password (15–128 characters)</label>
            <PasswordInput
              id="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={15}
              maxLength={128}
              autoComplete="new-password"
              disabled={busy}
              aria-describedby="password-guidance"
            />
            <p id="password-guidance" role="status" className="text-sm text-muted-foreground">
              {passwordGuidance(password)}
            </p>
            <label htmlFor="confirm-password">Confirm new password</label>
            <PasswordInput
              id="confirm-password"
              value={confirmation}
              onChange={(e) => setConfirmation(e.target.value)}
              required
              autoComplete="new-password"
              disabled={busy}
            />
          </>
        )}
        {status && <p role="status">{status}</p>}
        <Button type="submit" loading={busy}>
          {valid ? 'Reset password' : 'Verify invitation'}
        </Button>
      </form>
    </AuthLayout>
  );
}
