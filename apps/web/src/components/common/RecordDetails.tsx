import type { ReactNode } from 'react';

/** Exact caller-owned values, with visible labels and no formatting or truncation. */
export function RecordDetails({
  label,
  items,
}: {
  label: string;
  items: { label: string; value: ReactNode }[];
}) {
  return (
    <dl aria-label={label} className="record-details">
      {items.map((item, index) => (
        <div key={`${item.label}-${index}`}>
          <dt>{item.label}</dt>
          <dd>{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}
