import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { BackHandler, Platform } from 'react-native';
function useStack() {
  const [stack, setStack] = useState(['/dashboard']);
  const target = stack[stack.length - 1]!,
    rawPath = target.split('?')[0]!,
    path =
      rawPath === '/settings/staff' ? '/staff' : rawPath === '/settings/users' ? '/team' : rawPath;
  const search = target.includes('?search=')
    ? decodeURIComponent(target.split('?search=')[1] ?? '')
    : undefined;
  function back() {
    setStack((previous) => (previous.length > 1 ? previous.slice(0, -1) : ['/dashboard']));
  }
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const listener = BackHandler.addEventListener('hardwareBackPress', () => {
      if (stack.length <= 1) return false;
      back();
      return true;
    });
    return () => listener.remove();
  }, [stack.length]);
  return {
    path,
    stock: target.includes('?stock=') ? target.split('?stock=')[1] : undefined,
    search,
    back,
    navigate: (next: string, root = false) =>
      setStack((previous) =>
        root ? [next] : previous[previous.length - 1] === next ? previous : [...previous, next],
      ),
  };
}
const Context = createContext<ReturnType<typeof useStack> | null>(null);
export function NavigationProvider({ children }: { children: ReactNode }) {
  const value = useStack();
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useNavigation() {
  const value = useContext(Context);
  if (!value) throw new Error('Navigation provider required');
  return value;
}
