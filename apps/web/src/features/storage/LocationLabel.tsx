/* eslint-disable jsx-a11y/no-noninteractive-tabindex -- Horizontal barcode region requires keyboard scrolling; verified with axe. */
import { locationLabel } from '@inventory/domain';
export function LocationLabel({ id, code }: { id: string; code: string }) {
  const label = locationLabel(id);
  return (
    <figure>
      <figcaption>
        {code} · {label.value}
      </figcaption>
      <div
        className="overflow-x-auto"
        tabIndex={0}
        role="region"
        aria-label={`Scrollable location label ${code}`}
      >
        <svg
          role="img"
          aria-label={`Location barcode ${label.value}`}
          width={label.width}
          height="60"
          viewBox={`0 0 ${label.width} 60`}
        >
          <rect width="100%" height="100%" fill="white" />
          {label.bars.map((b) => (
            <rect key={b.x} x={b.x} width={b.width} height="60" fill="black" />
          ))}
        </svg>
      </div>
    </figure>
  );
}
