import { lockOffline } from '../offline/offline-lock';
import { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';
import { passwordGuidance } from '@inventory/api-client';
import type { AuthLink } from '@inventory/api-client';
import { Text, TextInput } from '../ui/Themed';
import { Action, Field } from '../ui/Controls';
import { useTheme } from '../theme';
import { useAccount } from '../shell/SessionContext';
import { authClient } from './client';
export function RecoveryScreen({
  link,
  forgot,
  navigate,
}: {
  link: AuthLink | null;
  forgot: boolean;
  navigate: (path: string) => void;
}) {
  const theme = useTheme(),
    account = useAccount();
  const [email, setEmail] = useState(link?.email ?? ''),
    [token, setToken] = useState(link?.token ?? '');
  const [password, setPassword] = useState(''),
    [confirm, setConfirm] = useState(''),
    [busy, setBusy] = useState(link?.kind === 'reset'),
    [valid, setValid] = useState(false),
    [message, setMessage] = useState('');
  const verify = useCallback(
    (address: string, code: string) =>
      authClient
        .recoveryStatus(address, code)
        .then(() => setValid(true))
        .catch(() => {
          setValid(false);
          setMessage(
            'Unable to validate this recovery invitation. It may be expired or invalid. Check your connection or request a new code.',
          );
        })
        .finally(() => setBusy(false)),
    [],
  );
  useEffect(() => {
    if (link?.kind === 'reset') void verify(link.email, link.token);
  }, [link, verify]);
  async function reset() {
    if (password !== confirm || password.length < 15 || password.length > 128) {
      setMessage('Use matching passwords of 15–128 characters.');
      return;
    }
    setBusy(true);
    try {
      await authClient.resetPassword(email, password, token);
      lockOffline();
      setPassword('');
      setConfirm('');
      setToken('');
      await account.run(async () => null);
      navigate('/auth/login');
    } catch {
      setMessage(
        'Password was not reset. Verify the invitation and connection before trying again.',
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <View style={{ gap: theme.spacing.medium }}>
      <Action variant="ghost" label="← Back to sign in" onPress={() => navigate('/auth/login')} />
      <Text accessibilityRole="header">
        {forgot ? 'Recover your account' : 'Reset your password'}
      </Text>
      {forgot ? (
        <>
          <Text>
            Contact your organization administrator through your established support channel. An
            authorized operator verifies your identity and issues a recovery invitation. This
            application does not send recovery email or notify an administrator automatically.
          </Text>
          <Action label="I have a recovery code" onPress={() => navigate('/auth/reset')} />
        </>
      ) : (
        <>
          {Boolean(message) && (
            <Text accessibilityRole="alert" tone="error">
              {message}
            </Text>
          )}
          {busy && <Text accessibilityLiveRegion="polite">Checking recovery invitation…</Text>}
          {!valid ? (
            <>
              <Field label="Account email" value={email} onChange={setEmail} />
              <Field label="Recovery code" value={token} onChange={setToken} maxLength={43} />
              <Action
                label="Verify recovery code"
                disabled={busy}
                onPress={() => {
                  setBusy(true);
                  setValid(false);
                  setMessage('');
                  void verify(email, token);
                }}
              />
            </>
          ) : (
            <>
              <Text>New password</Text>
              <TextInput
                accessibilityLabel="New password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                maxLength={128}
              />
              <Text accessibilityLiveRegion="polite">{passwordGuidance(password)}</Text>
              <Text>Confirm password</Text>
              <TextInput
                accessibilityLabel="Confirm password"
                value={confirm}
                onChangeText={setConfirm}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                maxLength={128}
              />
              <Action
                label="Reset password and revoke sessions"
                disabled={busy}
                onPress={() => void reset()}
              />
            </>
          )}
        </>
      )}
    </View>
  );
}
