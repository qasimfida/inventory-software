import { useLayoutEffect, useRef } from 'react';
/** Sticky children follow wrapped headers and text scaling without changing header sizing. */
export function useHeaderHeight() {
  const ref = useRef<HTMLElement>(null);
  useLayoutEffect(() => {
    const header = ref.current,
      shell = header?.closest<HTMLElement>('.application-shell');
    if (!header || !shell) return;
    const update = () =>
      shell.style.setProperty(
        '--header-occupied-height',
        `${header.getBoundingClientRect().height}px`,
      );
    const observer = new ResizeObserver(update);
    update();
    observer.observe(header);
    return () => {
      observer.disconnect();
      shell.style.removeProperty('--header-occupied-height');
    };
  }, []);
  return ref;
}
