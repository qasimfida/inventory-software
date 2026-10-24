/* eslint-disable jsx-a11y/no-noninteractive-element-interactions, jsx-a11y/no-noninteractive-tabindex -- ARIA window splitter is a focusable separator with arrow-key resizing. */
import { Hint } from '@/components/ui/Tooltip';
import { useRef } from 'react';
/** Pointer and keyboard resizing is view-local; account preferences remain unchanged. */
export function SidebarResizeHandle({
  width,
  onChange,
}: {
  width: number;
  onChange: (width: number) => void;
}) {
  const drag = useRef<{ x: number; width: number } | null>(null);
  const resize = (value: number) => onChange(Math.max(208, Math.min(384, value)));
  return (
    <Hint label="Drag to resize; use arrow keys when focused">
      <div
        role="separator"
        aria-label="Resize sidebar"
        aria-orientation="vertical"
        aria-valuemin={208}
        aria-valuemax={384}
        aria-valuenow={width}
        tabIndex={0}
        className="sidebar-resize-handle"
        onPointerDown={(event) => {
          if (event.button !== 0) return;
          drag.current = { x: event.clientX, width };
          event.currentTarget.setPointerCapture(event.pointerId);
        }}
        onPointerMove={(event) => {
          if (drag.current) resize(drag.current.width + event.clientX - drag.current.x);
        }}
        onPointerUp={(event) => {
          drag.current = null;
          event.currentTarget.releasePointerCapture(event.pointerId);
        }}
        onLostPointerCapture={() => {
          drag.current = null;
        }}
        onKeyDown={(event) => {
          if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
          event.preventDefault();
          resize(
            event.key === 'Home'
              ? 208
              : event.key === 'End'
                ? 384
                : width + (event.key === 'ArrowRight' ? 16 : -16),
          );
        }}
      />
    </Hint>
  );
}
