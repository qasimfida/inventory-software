import type { ComponentRef } from 'react';
import { useEffect, useRef } from 'react';
import { View, useWindowDimensions } from 'react-native';
import { useScrollSource } from './ScrollEvents';
import { Action } from './Controls';
export function LoadMore({
  label,
  hasMore,
  busy = false,
  onLoad,
}: {
  label: string;
  hasMore: boolean;
  busy?: boolean;
  onLoad: () => void;
}) {
  const pending = useRef(false);
  const requested = useRef(-1);
  const load = useRef(onLoad);
  useEffect(() => {
    load.current = onLoad;
  }, [onLoad]);
  const ref = useRef<ComponentRef<typeof View>>(null),
    source = useScrollSource(),
    { height: screenHeight } = useWindowDimensions();
  useEffect(() => {
    if (busy) pending.current = false;
    if (!hasMore || busy) return;
    let active = true;
    const check = () =>
      ref.current?.measureInWindow((x, y, width, height) => {
        if (
          active &&
          !pending.current &&
          requested.current !== (source?.version() ?? 0) &&
          width > 0 &&
          Number.isFinite(x) &&
          height > 0 &&
          y > 0 &&
          y + height < screenHeight
        ) {
          pending.current = true;
          requested.current = source?.version() ?? 0;
          load.current();
        }
      });
    const timer = setTimeout(check, 100);
    const unsubscribe = source?.subscribe(check);
    return () => {
      active = false;
      clearTimeout(timer);
      unsubscribe?.();
    };
  }, [source, hasMore, busy, screenHeight]);
  if (!hasMore) return null;
  return (
    <View ref={ref} collapsable={false}>
      <Action
        variant="ghost"
        label={busy ? 'Loading…' : `Load more ${label}`}
        disabled={busy}
        onPress={onLoad}
      />
    </View>
  );
}
