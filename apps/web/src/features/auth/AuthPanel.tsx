import { Link, Navigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/FormControls';
import { authClient } from '@/platform/auth-client';
import { useAccount } from '@/shell/SessionContext';
import { AuthLayout } from './AuthLayout';
import { PasswordInput } from './PasswordInput';
import { pendingAuthLink } from './link-state';
export function AuthPanel() {
  const { session, busy, message, run } = useAccount();
  const invited = useLocation().pathname === '/auth/invitation';
  if (session) return <Navigate to="/dashboard" replace />;
  return (
    <AuthLayout title={invited ? 'Accept your invitation' : 'Sign in'}>
      <p className="text-center text-sm text-muted-foreground">
        {invited
          ? 'Use the invitation provided by your trusted operator.'
          : 'Sign in to manage your inventory.'}
      </p>
      <form
        className="space-y-3"
        onSubmit={(event) => {
          event.preventDefault();
          const form = event.currentTarget,
            data = new FormData(form);
          const email = String(data.get('email')),
            password = String(data.get('password')),
            token = String(data.get('invitation') ?? '');
          form.reset();
          pendingAuthLink.clear();
          void run(() =>
            invited ? authClient.accept(email, password, token) : authClient.login(email, password),
          );
        }}
      >
        <label htmlFor="auth-email">Account email</label>
        <Input
          id="auth-email"
          name="email"
          type="email"
          defaultValue={invited ? pendingAuthLink.get()?.email : undefined}
          autoComplete="username"
          required
          maxLength={254}
          disabled={busy}
        />
        <label htmlFor="auth-password">Password{invited ? ' (15–128 characters)' : ''}</label>
        <PasswordInput
          id="auth-password"
          name="password"
          autoComplete={invited ? 'new-password' : 'current-password'}
          minLength={invited ? 15 : 1}
          maxLength={128}
          required
          disabled={busy}
        />
        {invited && (
          <>
            <label htmlFor="auth-invitation">Invitation code</label>
            <Input
              id="auth-invitation"
              name="invitation"
              type="password"
              autoComplete="off"
              defaultValue={pendingAuthLink.get()?.token}
              required
              minLength={43}
              maxLength={43}
              disabled={busy}
            />
          </>
        )}
        {message && (
          <p role="alert" className="text-destructive">
            {message}
          </p>
        )}
        <Button className="w-full" loading={busy} type="submit">
          {invited ? 'Accept invitation' : 'Log in'}
        </Button>
      </form>
      <Link className="block text-sm text-primary" to="/auth/forgot">
        Forgot password?
      </Link>
      <Link
        className="block text-sm text-primary"
        to={invited ? '/auth/login' : '/auth/invitation'}
      >
        {invited ? 'Use existing account' : 'I have an invitation'}
      </Link>
    </AuthLayout>
  );
}
