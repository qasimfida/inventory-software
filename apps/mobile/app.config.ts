import type { ConfigContext, ExpoConfig } from 'expo/config';
export default ({ config }: ConfigContext): ExpoConfig => {
  if (process.env.NODE_ENV === 'production' && process.env.EXPO_PUBLIC_USE_MOCKS === 'true')
    throw new Error('Mock mode is forbidden in production builds.');
  const origin = process.env.EXPO_PUBLIC_APP_ORIGIN;
  if (!origin) return config as ExpoConfig;
  const url = new URL(origin);
  if (
    url.protocol !== 'https:' ||
    url.pathname !== '/' ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    url.hostname.endsWith('.invalid')
  )
    throw new Error('EXPO_PUBLIC_APP_ORIGIN must be your configured production HTTPS origin.');
  return {
    ...config,
    ios: { ...config.ios, associatedDomains: [`applinks:${url.host}`] },
    android: {
      ...config.android,
      intentFilters: [
        {
          action: 'VIEW',
          autoVerify: true,
          data: [{ scheme: 'https', host: url.host, pathPrefix: '/auth/' }],
          category: ['BROWSABLE', 'DEFAULT'],
        },
      ],
    },
  } as ExpoConfig;
};
