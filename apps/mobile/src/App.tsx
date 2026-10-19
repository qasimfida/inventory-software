import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { createApiClient } from '@inventory/api-client';
import { theme } from './theme';

export function App() {
  const [status, setStatus] = useState<'idle' | 'loading' | 'ok' | 'error'>('idle');
  async function checkConnection() {
    setStatus('loading');
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    try {
      const baseUrl = process.env.EXPO_PUBLIC_API_BASE_URL;
      if (!baseUrl) throw new Error('Configure EXPO_PUBLIC_API_BASE_URL.');
      const client = createApiClient(baseUrl, (url) => fetch(url, { signal: controller.signal }));
      await client.getHealth();
      setStatus('ok');
    } catch {
      setStatus('error');
    } finally {
      clearTimeout(timeout);
    }
  }
  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.container}>
      <Text accessibilityRole="header" style={styles.title}>
        Inventory platform
      </Text>
      <Text style={styles.description}>
        Development foundation. Business workflows and offline storage are not implemented.
      </Text>
      <Text style={styles.description}>Connection checks API liveness only.</Text>
      {status === 'loading' && (
        <ActivityIndicator accessibilityLabel="Checking API" color={theme.colors.primary} />
      )}
      <Text
        accessibilityLiveRegion="polite"
        style={status === 'error' ? styles.error : styles.description}
      >
        {status === 'idle'
          ? 'No connection check has been run.'
          : status === 'ok'
            ? 'API is reachable.'
            : status === 'error'
              ? 'Unable to reach the API. Check the connection and API address.'
              : 'Checking…'}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: status === 'loading' }}
        disabled={status === 'loading'}
        style={styles.button}
        onPress={() => void checkConnection()}
      >
        <Text style={styles.buttonText}>
          {status === 'error' ? 'Try again' : 'Check connection'}
        </Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: theme.spacing.large,
    gap: theme.spacing.medium,
    backgroundColor: theme.colors.background,
  },
  title: { fontSize: 30, fontWeight: '600', color: theme.colors.foreground },
  description: { fontSize: 16, lineHeight: 24, color: theme.colors.muted },
  error: { fontSize: 16, color: theme.colors.error },
  button: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.medium,
    borderRadius: theme.radius,
    backgroundColor: theme.colors.primary,
  },
  buttonText: { color: theme.colors.onPrimary, fontSize: 16, fontWeight: '600' },
});
