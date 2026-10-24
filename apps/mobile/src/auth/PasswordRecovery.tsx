import { DisclosureTrigger } from '../ui/DisclosureTrigger';
import { useState } from 'react';
import { View } from 'react-native';
import { AuthenticationError } from '@inventory/api-client';
import { authClient } from './client';
import { Action, Field } from '../ui/Controls';
import { Text, TextInput } from '../ui/Themed';
import { lockOffline } from '../offline/offline-lock';

export function PasswordRecovery() {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [message, setMessage] = useState('');
  async function reset() {
    if (busy) return;
    const secret = password,
      token = code;
    setPassword('');
    setCode('');
    setBusy(true);
    setMessage('');
    lockOffline();
    try {
      await authClient.resetPassword(email, secret, token);
      setMessage('Password reset. All online sessions ended. Sign in with your new password.');
    } catch (error) {
      setMessage(
        error instanceof AuthenticationError
          ? error.message
          : 'Reset was not confirmed. Try signing in with the new password before requesting another code.',
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <View style={{ gap: 12 }}>
      <DisclosureTrigger
        expanded={open}
        label="Forgot password / recovery code"
        disabled={busy}
        onPress={() => setOpen(!open)}
      />
      {open && (
        <>
          <Text>
            Contact your trusted account operator for a recovery code after identity verification.
            No email is sent. Codes expire after 30 minutes.
          </Text>
          <Field label="Recovery account email" value={email} onChange={setEmail} disabled={busy} />
          <Text>Recovery code</Text>
          <TextInput
            accessibilityLabel="Recovery code"
            value={code}
            onChangeText={setCode}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            maxLength={43}
            editable={!busy}
          />
          <Text>New password (15–128 characters)</Text>
          <TextInput
            accessibilityLabel="New password (15–128 characters)"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="new-password"
            maxLength={128}
            editable={!busy}
          />
          <Action
            label={busy ? 'Resetting password…' : 'Reset password'}
            disabled={busy || password.length < 15 || code.length !== 43}
            onPress={() => void reset()}
          />
          {message ? <Text accessibilityLiveRegion="polite">{message}</Text> : null}
        </>
      )}
    </View>
  );
}
