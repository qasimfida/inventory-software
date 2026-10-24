import { useState } from 'react';
import { View } from 'react-native';
import type { ActiveSession, Session } from '@inventory/contracts';
import { Text } from '../ui/Themed';
import { Action } from '../ui/Controls';
import { authClient } from './client';
import { lockOffline } from '../offline/offline-lock';
export function AccountSessions({
  session,
  busy,
  run,
}: {
  session: Session;
  busy: boolean;
  run: (work: () => Promise<Session | null>) => Promise<void>;
}) {
  const [sessions, setSessions] = useState<ActiveSession[]>([]);
  const [sessionsOwner, setSessionsOwner] = useState('');
  function action(label: string, work: () => Promise<Session | null>) {
    return (
      <Action variant="outline" label={label} disabled={busy} onPress={() => void run(work)} />
    );
  }
  return (
    <View style={{ gap: 12 }}>
      <Text>
        Expires {new Date(session.expiresAt).toLocaleTimeString()}. Sign in again after 12 hours.
      </Text>
      {action('Renew session', () => authClient.renew())}
      {action('Log out', async () => {
        lockOffline();
        await authClient.logout();
        setSessions([]);
        return null;
      })}
      {action('Log out all sessions', async () => {
        lockOffline();
        await authClient.logout(true);
        setSessions([]);
        return null;
      })}
      {action('Show active sessions', async () => {
        setSessions(await authClient.list());
        setSessionsOwner(session.user.id);
        return authClient.current();
      })}
      {(sessionsOwner === session.user.id ? sessions : []).map((entry) => (
        <View key={entry.id}>
          <Text>
            {entry.id === session.sessionId ? 'This session' : 'Other session'} ·{' '}
            {new Date(entry.createdAt).toLocaleString()} · Device {entry.deviceId ?? 'unrecognized'}
          </Text>
          {action(`Revoke session ${entry.id.slice(0, 8)}`, async () => {
            await authClient.revoke(entry.id);
            setSessions([]);
            return authClient.current();
          })}
        </View>
      ))}
    </View>
  );
}
