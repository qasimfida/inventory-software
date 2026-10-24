import { useEffect, useRef } from 'react';
import { Button } from '@/components/ui/Button';
/** One bounded request per scroll opportunity; short selects cannot drain a whole dataset. */
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
  const ref = useRef<HTMLDivElement>(null),
    load = useRef(onLoad);
  const gate = useRef({ scroll: 0, requested: -1 });
  useEffect(() => {
    load.current = onLoad;
  }, [onLoad]);
  useEffect(() => {
    if (busy) pending.current = false;
    const element = ref.current;
    if (!element || busy || !hasMore) return;
    const request = () => {
      const rect = element.getBoundingClientRect();
      if (
        !pending.current &&
        rect.height > 0 &&
        rect.top >= 0 &&
        rect.bottom <= window.innerHeight &&
        gate.current.requested !== gate.current.scroll
      ) {
        pending.current = true;
        gate.current.requested = gate.current.scroll;
        load.current();
      }
    };
    const scroll = () => {
      gate.current.scroll++;
      request();
    };
    const observer = window.IntersectionObserver ? new IntersectionObserver(request) : undefined;
    observer?.observe(element);
    window.addEventListener('scroll', scroll, true);
    return () => {
      observer?.disconnect();
      window.removeEventListener('scroll', scroll, true);
    };
  }, [busy, hasMore]);
  if (!hasMore) return null;
  return (
    <div ref={ref} className="flex justify-center py-3">
      <Button variant="ghost" disabled={busy} onClick={onLoad}>
        {busy ? 'Loading…' : `Load more ${label}`}
      </Button>
    </div>
  );
}
