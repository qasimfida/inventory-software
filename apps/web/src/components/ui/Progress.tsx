import * as Primitive from '@radix-ui/react-progress';
/** Omit value when completion cannot be measured. No synthetic percentage. */
export function Progress({
  value,
  label,
  className = '',
}: {
  value?: number | null;
  label: string;
  className?: string;
}) {
  const bounded = value == null ? null : Math.min(100, Math.max(0, value));
  return (
    <Primitive.Root value={bounded} aria-label={label} className={`progress-track ${className}`}>
      <Primitive.Indicator
        className="progress-indicator"
        style={{ width: bounded === null ? '35%' : `${bounded}%` }}
      />
    </Primitive.Root>
  );
}
