import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/Button';
/** Native scrolling and tab keyboard semantics remain owned by the child tablist. */
export function OverflowTabs({
  children,
  label = 'Settings',
}: {
  children: ReactNode;
  label?: string;
}) {
  const root = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ left: false, right: false });
  useEffect(() => {
    const list = root.current?.querySelector<HTMLElement>('[role="tablist"]');
    if (!list) return;
    const update = () =>
      setEdges({
        left: list.scrollLeft > 1,
        right: list.scrollLeft + list.clientWidth < list.scrollWidth - 1,
      });
    const resize = new ResizeObserver(update);
    resize.observe(list);
    const mutation = new MutationObserver(update);
    mutation.observe(list, { childList: true, subtree: true });
    list.addEventListener('scroll', update, { passive: true });
    update();
    return () => {
      resize.disconnect();
      mutation.disconnect();
      list.removeEventListener('scroll', update);
    };
  }, []);
  function move(direction: number) {
    const list = root.current?.querySelector<HTMLElement>('[role="tablist"]');
    list?.scrollBy({ left: direction * list.clientWidth * 0.7, behavior: 'auto' });
  }
  return (
    <div className="overflow-tabs" ref={root} data-left={edges.left} data-right={edges.right}>
      <Button
        className="tabs-scroll tabs-scroll-start"
        variant="ghost"
        size="icon"
        aria-label={`Scroll ${label.toLowerCase()} tabs left`}
        disabled={!edges.left}
        onClick={() => move(-1)}
      >
        <ChevronLeft />
      </Button>
      {children}
      <Button
        className="tabs-scroll tabs-scroll-end"
        variant="ghost"
        size="icon"
        aria-label={`Scroll ${label.toLowerCase()} tabs right`}
        disabled={!edges.right}
        onClick={() => move(1)}
      >
        <ChevronRight />
      </Button>
    </div>
  );
}
