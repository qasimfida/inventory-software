import { useState } from 'react';
import type { ActiveSession, Session } from '@inventory/contracts';
import { Button } from '@/components/ui/Button';
import { authClient } from '@/platform/auth-client';
import { lockOffline } from '../offline/offline-lock';

export function AccountSessions({
  session,
  busy,
  run,
}: {
  session: Session;
  busy: boolean;
  run: (action: () => Promise<Session | null>) => Promise<void>;
}) {
  const [sessions, setSessions] = useState<ActiveSession[]>([]);
  const [sessionsOwner, setSessionsOwner] = useState('');
  return (
    <div className="space-y-3">
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
            {entry.id === session.sessionId ? 'This session' : 'Other session'} · {entry.transport}{' '}
            · Device {entry.deviceId ?? 'unrecognized'} ·{' '}
            {new Date(entry.createdAt).toLocaleString()}{' '}
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
    </div>
  );
}
