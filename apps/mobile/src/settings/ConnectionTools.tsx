import { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';
import { createApiClient } from '@inventory/api-client';
import { Text } from '../ui/Themed';
import { Action } from '../ui/Controls';
import { NativeShowcase } from '../ui/NativeShowcase';
export function ConnectionTools() {
  const [status, setStatus] = useState<'idle' | 'loading' | 'ok' | 'error'>('idle');
  const checkConnection = useCallback(async () => {
    setStatus('loading');
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    try {
      const baseUrl = process.env.EXPO_PUBLIC_API_BASE_URL;
      if (!baseUrl) throw new Error('Configure EXPO_PUBLIC_API_BASE_URL.');
      const client = createApiClient(baseUrl, (url) => fetch(url, { signal: controller.signal }));
      await client.getHealth('ready');
      setStatus('ok');
    } catch {
      setStatus('error');
    } finally {
      clearTimeout(timeout);
    }
  }, []);
  useEffect(() => {
    const initial = setTimeout(() => void checkConnection(), 0);
    const timer = setInterval(() => void checkConnection(), 30000);
    return () => {
      clearTimeout(initial);
      clearInterval(timer);
    };
  }, [checkConnection]);
  return (
    <View style={{ gap: 16 }}>
      <Text accessibilityRole="header">Connectivity</Text>
      <Text accessibilityLiveRegion="polite">
        {status === 'ok'
          ? 'API and database are ready.'
          : status === 'error'
            ? 'Unable to reach the API. Check the connection and API address.'
            : status === 'loading'
              ? 'Checking…'
              : 'Check API and database readiness.'}
      </Text>
      <Action
        variant="outline"
        label={status === 'error' ? 'Try again' : 'Check connection'}
        disabled={status === 'loading'}
        onPress={() => void checkConnection()}
      />
      {typeof __DEV__ !== 'undefined' && __DEV__ && <NativeShowcase />}
    </View>
  );
}
