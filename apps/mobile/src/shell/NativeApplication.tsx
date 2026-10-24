import { IconAction } from '../ui/IconAction';
import { useEffect, useState } from 'react';
import { Linking } from 'react-native';
import { parseAuthLink } from '@inventory/api-client';
import type { AuthLink } from '@inventory/api-client';
import { OfflinePanel } from '../offline/OfflinePanel';
import { AuthPanel } from '../auth/AuthPanel';
import { RecoveryScreen } from '../auth/RecoveryScreen';
import { AppViewport } from '../ui/AppViewport';
import { LoadingState } from '../ui/AsyncState';
import { SessionProvider, useAccount } from './SessionContext';
import { WorkspaceProvider } from './WorkspaceContext';
import { NavigationProvider } from './Navigation';
import { NativeShell } from './NativeShell';
export function NativeApplication() {
  return (
    <SessionProvider>
      <SessionScreens />
    </SessionProvider>
  );
}
function SessionScreens() {
  const account = useAccount(),
    [path, setPath] = useState('/auth/login'),
    [link, setLink] = useState<AuthLink | null>(null),
    [linkRevision, setLinkRevision] = useState(0);
  useEffect(() => {
    const receive = (url: string | null | undefined) => {
      if (!url) return;
      if (url === 'inventory://offline' || url === 'inventory://offline/') {
        setPath('/offline');
        return;
      }
      const next = parseAuthLink(url, process.env.EXPO_PUBLIC_APP_ORIGIN);
      if (next) {
        setLink(next);
        setLinkRevision((value) => value + 1);
        setPath(`/auth/${next.kind}`);
      }
    };
    void Linking.getInitialURL().then(receive);
    const listener = Linking.addEventListener('url', (event) => receive(event.url));
    return () => listener.remove();
  }, []);
  function navigate(next: string) {
    setLink(null);
    setPath(next);
  }
  if (path === '/offline')
    return (
      <AppViewport>
        <IconAction label="Back to sign in" onPress={() => navigate('/auth/login')} icon="←" />
        <OfflinePanel allowSetup={false} />
      </AppViewport>
    );
  if (path === '/auth/forgot' || path === '/auth/reset')
    return (
      <AppViewport>
        <RecoveryScreen
          key={linkRevision}
          forgot={path === '/auth/forgot'}
          link={link}
          navigate={navigate}
        />
      </AppViewport>
    );
  if (account.busy && !account.session)
    return (
      <AppViewport>
        <LoadingState message="Checking saved session…" />
      </AppViewport>
    );
  if (!account.session)
    return (
      <AppViewport>
        <AuthPanel
          key={`${path}:${linkRevision}`}
          invited={path === '/auth/invitation'}
          link={link}
          navigate={navigate}
        />
      </AppViewport>
    );
  return (
    <WorkspaceProvider key={account.session.user.id}>
      <NavigationProvider>
        <NativeShell />
      </NavigationProvider>
    </WorkspaceProvider>
  );
}
