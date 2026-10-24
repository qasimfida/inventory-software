import { useAppearance } from '@/theme/Appearance';
import { LoadMore } from './LoadMore';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { paginationPages } from '@inventory/api-client';
import { Button } from '@/components/ui/Button';
export function Pagination({
  label,
  offset,
  pageSize = 25,
  total,
  hasMore,
  busy = false,
  onChange,
}: {
  label: string;
  offset: number;
  pageSize?: number;
  total?: number;
  hasMore: boolean;
  busy?: boolean;
  onChange: (offset: number) => void;
}) {
  const { preferences } = useAppearance();
  const page = Math.floor(offset / pageSize) + 1;
  const last =
    total === undefined ? page + Number(hasMore) : Math.max(1, Math.ceil(total / pageSize));
  if (preferences.pagination === 'scroll')
    return (
      <LoadMore
        label={label}
        hasMore={hasMore}
        busy={busy}
        onLoad={() => onChange(offset + pageSize)}
      />
    );
  if (last <= 1 && !hasMore && offset === 0) return null;
  return (
    <nav
      aria-label={`${label} pagination`}
      className="pagination flex flex-wrap items-center justify-center gap-2 py-3"
    >
      <Button
        variant="ghost"
        size="icon"
        aria-label={`Previous ${label}`}
        disabled={busy || offset === 0}
        onClick={() => onChange(Math.max(0, offset - pageSize))}
      >
        <ChevronLeft />
      </Button>
      {paginationPages(page, last).map((n, i) =>
        n === 'gap' ? (
          <span key={`gap-${i}`} aria-hidden="true">
            …
          </span>
        ) : (
          <Button
            key={n}
            variant={n === page ? 'default' : 'ghost'}
            size="sm"
            aria-label={`Page ${n}`}
            aria-current={n === page ? 'page' : undefined}
            disabled={busy}
            onClick={() => onChange((n - 1) * pageSize)}
          >
            {n}
          </Button>
        ),
      )}
      {total === undefined && hasMore && <span aria-label="More pages may be available">…</span>}
      <Button
        variant="ghost"
        size="icon"
        aria-label={`Next ${label}`}
        disabled={busy || !hasMore}
        onClick={() => onChange(offset + pageSize)}
      >
        <ChevronRight />
      </Button>
    </nav>
  );
}
