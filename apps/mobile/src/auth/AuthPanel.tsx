import { OfflinePanel } from '../offline/OfflinePanel';
import { lockOffline } from '../offline/offline-lock';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { ManagementPanel } from '../organization/ManagementPanel';
import { useSession } from './useSession';
import type { ActiveSession, Session } from '@inventory/contracts';
import { authClient } from './client';
import { theme } from '../theme';

export function AuthPanel() {
  const { session, busy, message, run } = useSession();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [invitation, setInvitation] = useState('');
  const [invited, setInvited] = useState(false);
  const [sessions, setSessions] = useState<ActiveSession[]>([]);
  const [sessionsOwner, setSessionsOwner] = useState('');
  function action(label: string, work: () => Promise<Session | null>) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: busy }}
        disabled={busy}
        style={styles.button}
        onPress={() => void run(work)}
      >
        <Text style={styles.buttonText}>{label}</Text>
      </Pressable>
    );
  }
  return (
    <View style={styles.container}>
      <Text accessibilityRole="header" style={styles.heading}>
        Account access
      </Text>
      <Text>
        Invitation required. Management requires a connection; offline cash uses a separate bounded
        permission below.
      </Text>
      {message ? (
        <Text accessibilityRole="alert" style={styles.error}>
          {message}
        </Text>
      ) : null}
      {busy ? <Text accessibilityLiveRegion="polite">Verifying session…</Text> : null}
      {session ? (
        <>
          <Text>Signed in as {session.user.email}</Text>
          {!busy && <ManagementPanel key={session.user.id} />}
          <Text>
            Expires {new Date(session.expiresAt).toLocaleTimeString()}. Sign in again after 12
            hours.
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
                {new Date(entry.createdAt).toLocaleString()}
              </Text>
              {action(`Revoke session ${entry.id.slice(0, 8)}`, async () => {
                await authClient.revoke(entry.id);
                setSessions([]);
                return authClient.current();
              })}
            </View>
          ))}
        </>
      ) : (
        <>
          <Text>Account email</Text>
          <TextInput
            accessibilityLabel="Account email"
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="username"
            keyboardType="email-address"
            maxLength={254}
            editable={!busy}
          />
          <Text>Password{invited ? ' (15–128 characters)' : ''}</Text>
          <TextInput
            accessibilityLabel="Password"
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete={invited ? 'new-password' : 'current-password'}
            maxLength={128}
            editable={!busy}
          />
          {invited && (
            <>
              <Text>Invitation code</Text>
              <TextInput
                accessibilityLabel="Invitation code"
                style={styles.input}
                value={invitation}
                onChangeText={setInvitation}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                maxLength={43}
                editable={!busy}
              />
            </>
          )}
          {action(invited ? 'Accept invitation' : 'Log in', async () => {
            const secret = password;
            const code = invitation;
            setPassword('');
            setInvitation('');
            const result = await (invited
              ? authClient.accept(email, secret, code)
              : authClient.login(email, secret));
            setInvited(false);
            return result;
          })}
          <Pressable
            accessibilityRole="button"
            disabled={busy}
            onPress={() => setInvited(!invited)}
            style={styles.button}
          >
            <Text style={styles.buttonText}>
              {invited ? 'Use existing account' : 'I have an invitation'}
            </Text>
          </Pressable>
          {action('Check saved session', () => authClient.current())}
        </>
      )}
      <OfflinePanel />
    </View>
  );
}
const styles = StyleSheet.create({
  container: { gap: 12, paddingVertical: 24 },
  heading: { fontSize: 24, fontWeight: '600' },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.muted,
    borderRadius: theme.radius,
    minHeight: 48,
    padding: 12,
    color: theme.colors.foreground,
  },
  button: {
    minHeight: 48,
    padding: 12,
    borderRadius: theme.radius,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
  },
  buttonText: { color: theme.colors.onPrimary, fontSize: 16 },
  error: { color: theme.colors.error },
});
