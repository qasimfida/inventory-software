import { IconAction } from '../ui/IconAction';
import { useState } from 'react';
import { View } from 'react-native';
import { Text, TextInput } from '../ui/Themed';
import { Action } from '../ui/Controls';
import { useTheme } from '../theme';
import { metrics } from '../ui/metrics';
import { useAccount } from '../shell/SessionContext';
import { authClient } from './client';
import type { AuthLink } from '@inventory/api-client';
export function AuthPanel({
  invited = false,
  link,
  navigate,
}: {
  invited?: boolean;
  link?: AuthLink | null;
  navigate: (path: string) => void;
}) {
  const theme = useTheme(),
    { busy, message, run } = useAccount();
  const [email, setEmail] = useState(link?.email ?? ''),
    [password, setPassword] = useState(''),
    [code, setCode] = useState(link?.token ?? '');
  const [visible, setVisible] = useState(false),
    [error, setError] = useState('');
  async function submit() {
    if (!email.trim() || !password || (invited && (password.length < 15 || code.length !== 43))) {
      setError('Enter your email, password and a valid invitation code where required.');
      return;
    }
    setError('');
    const secret = password,
      token = code;
    setPassword('');
    setCode('');
    await run(async () => {
      const session = invited
        ? await authClient.accept(email.trim(), secret, token)
        : await authClient.login(email.trim(), secret);
      navigate('/dashboard');
      return session;
    });
  }
  return (
    <View style={{ gap: theme.spacing.medium, paddingVertical: theme.spacing.large }}>
      <Text
        accessibilityRole="header"
        style={{ fontSize: metrics.title, fontWeight: '600', textAlign: 'center' }}
      >
        Inventory
      </Text>
      <Text accessibilityRole="header" style={{ fontSize: metrics.heading }}>
        {invited ? 'Accept your invitation' : 'Sign in'}
      </Text>
      <Text tone="muted">Sign in to manage your inventory.</Text>
      {Boolean(error || message) && (
        <Text tone="error" accessibilityRole="alert">
          {error || message}
        </Text>
      )}
      <Text>Account email</Text>
      <TextInput
        accessibilityLabel="Account email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="username"
        editable={!busy}
      />
      <Text>Password{invited ? ' (15–128 characters)' : ''}</Text>
      <View style={{ position: 'relative' }}>
        <TextInput
          style={{ paddingRight: metrics.target }}
          accessibilityLabel="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry={!visible}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete={invited ? 'new-password' : 'current-password'}
          maxLength={128}
          editable={!busy}
        />
        <View
          style={{ position: 'absolute', right: 0, top: 0, bottom: 0, justifyContent: 'center' }}
        >
          <IconAction
            label={visible ? 'Hide password' : 'Show password'}
            icon={visible ? 'eye-off' : 'eye'}
            disabled={busy}
            onPress={() => setVisible(!visible)}
          />
        </View>
      </View>
      {invited && (
        <>
          <Text>Invitation code</Text>
          <TextInput
            accessibilityLabel="Invitation code"
            value={code}
            onChangeText={setCode}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            maxLength={43}
          />
        </>
      )}
      <Action variant="link" label="Forgot password?" onPress={() => navigate('/auth/forgot')} />
      <Action
        label={busy ? 'Signing in…' : invited ? 'Accept invitation' : 'Continue'}
        disabled={busy}
        onPress={() => void submit()}
      />
      <Action
        variant="link"
        label={invited ? 'Use existing account' : 'I have an invitation'}
        onPress={() => navigate(invited ? '/auth/login' : '/auth/invitation')}
      />
    </View>
  );
}
