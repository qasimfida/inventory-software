export function Skeleton({ label = 'Loading content' }: { label?: string }) {
  return (
    <div role="status" aria-label={label} className="space-y-2">
      <div className="h-4 w-3/4 rounded bg-muted" aria-hidden="true" />
      <div className="h-4 w-1/2 rounded bg-muted" aria-hidden="true" />
    </div>
  );
}
