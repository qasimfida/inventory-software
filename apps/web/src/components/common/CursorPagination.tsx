import { useAppearance } from '@/theme/Appearance';
import { Button } from '@/components/ui/Button';
import { LoadMore } from './LoadMore';
export function CursorPagination({
  label,
  hasMore,
  previous = false,
  busy = false,
  onNext,
  onReset,
}: {
  label: string;
  hasMore: boolean;
  previous?: boolean;
  busy?: boolean;
  onNext: () => void;
  onReset?: () => void;
}) {
  const { preferences } = useAppearance();
  if (preferences.pagination === 'scroll')
    return <LoadMore label={label} hasMore={hasMore} busy={busy} onLoad={onNext} />;
  if (!hasMore && !previous) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {previous && onReset && (
        <Button variant="ghost" disabled={busy} onClick={onReset}>
          Newest {label}
        </Button>
      )}
      {hasMore && (
        <Button variant="ghost" disabled={busy} onClick={onNext}>
          More {label}
        </Button>
      )}
    </div>
  );
}
