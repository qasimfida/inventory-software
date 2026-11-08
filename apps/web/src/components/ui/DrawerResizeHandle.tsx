/* eslint-disable jsx-a11y/no-noninteractive-element-interactions, jsx-a11y/no-noninteractive-tabindex -- A keyboard-operable ARIA window splitter. */
import { useEffect, useRef, useState, type RefObject } from 'react';
import { Hint } from './Tooltip';
/** View-local width only: pointer/keyboard splitter, bounded to the current viewport. */
export function DrawerResizeHandle({
  content,
  onResize,
}: {
  content: RefObject<HTMLDivElement | null>;
  onResize: (width: number | null) => void;
}) {
  const [width, setWidth] = useState(0);
  const [viewport, setViewport] = useState(() => window.innerWidth);
  const drag = useRef<{ x: number; width: number; left: boolean } | null>(null);
  const max = Math.max(320, viewport - 32);
  const resize = (value: number) => {
    const next = Math.round(Math.max(320, Math.min(max, value)));
    onResize(next);
    setWidth(next);
  };
  useEffect(() => {
    const update = () => setViewport(window.innerWidth);
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);
  useEffect(() => {
    const element = content.current;
    if (!element) return;
    const observer = new ResizeObserver(() =>
      setWidth(Math.round(element.getBoundingClientRect().width)),
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [content]);
  return (
    <div className="drawer-resize-anchor" data-vaul-no-drag>
      <Hint label="Drag to resize; arrow keys adjust width; double-click to reset">
        <div
          role="separator"
          aria-label="Resize drawer"
          aria-orientation="vertical"
          aria-valuemin={320}
          aria-valuemax={max}
          aria-valuenow={Math.max(320, Math.min(max, width))}
          aria-valuetext={`${width} pixels wide`}
          tabIndex={0}
          className="drawer-resize-handle"
          onPointerDown={(event) => {
            if (event.button !== 0) return;
            event.preventDefault();
            event.stopPropagation();
            event.currentTarget.focus();
            drag.current = {
              x: event.clientX,
              width: content.current?.getBoundingClientRect().width ?? width,
              left: content.current?.dataset.vaulDrawerDirection === 'left',
            };
            event.currentTarget.setPointerCapture(event.pointerId);
          }}
          onPointerMove={(event) => {
            if (drag.current)
              resize(
                drag.current.width +
                  (event.clientX - drag.current.x) * (drag.current.left ? 1 : -1),
              );
          }}
          onPointerUp={(event) => {
            drag.current = null;
            if (event.currentTarget.hasPointerCapture(event.pointerId))
              event.currentTarget.releasePointerCapture(event.pointerId);
          }}
          onPointerCancel={() => {
            drag.current = null;
          }}
          onLostPointerCapture={() => {
            drag.current = null;
          }}
          onDoubleClick={() => onResize(null)}
          onKeyDown={(event) => {
            if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
            event.preventDefault();
            event.stopPropagation();
            const left = content.current?.dataset.vaulDrawerDirection === 'left';
            resize(
              event.key === 'Home'
                ? 320
                : event.key === 'End'
                  ? max
                  : width + ((event.key === 'ArrowRight') === left ? 16 : -16),
            );
          }}
        />
      </Hint>
    </div>
  );
}
