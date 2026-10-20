import { OfflinePanel } from '../offline/OfflinePanel';
import { lockOffline } from '../offline/offline-lock';
import { useState } from 'react';
import type { FormEvent } from 'react';
import type { ActiveSession } from '@inventory/contracts';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/FormControls';
import { Panel } from '@/components/common/Layout';
import { authClient } from '@/platform/auth-client';
import { ManagementPanel } from '../organization/ManagementPanel';
import { useSession } from './useSession';

export function AuthPanel() {
  const { session, busy, message, run } = useSession();
  const [invited, setInvited] = useState(false);
  const [sessions, setSessions] = useState<ActiveSession[]>([]);
  const [sessionsOwner, setSessionsOwner] = useState('');
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const email = String(data.get('email'));
    const password = String(data.get('password'));
    const invitation = String(data.get('invitation') ?? '');
    form.reset();
    void run(async () => {
      const result = await (invited
        ? authClient.accept(email, password, invitation)
        : authClient.login(email, password));
      setInvited(false);
      return result;
    });
  }
  return (
    <Panel aria-labelledby="auth-title">
      <h2 id="auth-title">Account access</h2>
      <p className="text-sm text-muted-foreground">
        Invitation required. Online verification is required; management requires a connection.
        Offline cash uses a separate bounded permission below.
      </p>
      {message && <p role="alert">{message}</p>}
      {busy && <p role="status">Verifying session…</p>}
      {session ? (
        <>
          <p>Signed in as {session.user.email}</p>
          {!busy && <ManagementPanel key={session.user.id} />}
          <p className="text-sm">
            Expires {new Date(session.expiresAt).toLocaleTimeString()}. Renew before expiry; sign in
            again after 12 hours.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button disabled={busy} onClick={() => void run(() => authClient.renew())}>
              Renew session
            </Button>
            <Button
              disabled={busy}
              variant="outline"
              onClick={() =>
                void run(async () => {
                  lockOffline();
                  await authClient.logout();
                  setSessions([]);
                  return null;
                })
              }
            >
              Log out
            </Button>
            <Button
              disabled={busy}
              variant="outline"
              onClick={() =>
                void run(async () => {
                  lockOffline();
                  await authClient.logout(true);
                  setSessions([]);
                  return null;
                })
              }
            >
              Log out all sessions
            </Button>
            <Button
              disabled={busy}
              variant="outline"
              onClick={() =>
                void run(async () => {
                  setSessions(await authClient.list());
                  setSessionsOwner(session.user.id);
                  return authClient.current();
                })
              }
            >
              Show active sessions
            </Button>
          </div>
          <ul className="space-y-2">
            {(sessionsOwner === session.user.id ? sessions : []).map((entry) => (
              <li key={entry.id}>
                {entry.id === session.sessionId ? 'This session' : 'Other session'} ·{' '}
                {entry.transport} · {new Date(entry.createdAt).toLocaleString()}{' '}
                <Button
                  disabled={busy}
                  variant="outline"
                  onClick={() =>
                    void run(async () => {
                      await authClient.revoke(entry.id);
                      setSessions([]);
                      return authClient.current();
                    })
                  }
                >
                  Revoke session {entry.id.slice(0, 8)}
                </Button>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <form onSubmit={submit} className="space-y-3">
          <label htmlFor="auth-email">Account email</label>
          <Input
            id="auth-email"
            name="email"
            type="email"
            autoComplete="username"
            required
            maxLength={254}
            disabled={busy}
          />
          <label htmlFor="auth-password">Password{invited ? ' (15–128 characters)' : ''}</label>
          <Input
            id="auth-password"
            name="password"
            type="password"
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
                autoComplete="off"
                type="password"
                required
                minLength={43}
                maxLength={43}
                disabled={busy}
              />
            </>
          )}
          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={busy}>
              {invited ? 'Accept invitation' : 'Log in'}
            </Button>
            <Button variant="outline" disabled={busy} onClick={() => setInvited(!invited)}>
              {invited ? 'Use existing account' : 'I have an invitation'}
            </Button>
            <Button
              variant="outline"
              disabled={busy}
              onClick={() => void run(() => authClient.current())}
            >
              Check saved session
            </Button>
          </div>
        </form>
      )}
      <OfflinePanel />
    </Panel>
  );
}
