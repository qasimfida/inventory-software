import { useTheme } from '../theme';
import { LoadMore } from './LoadMore';
import { View } from 'react-native';
import { paginationPages } from '@inventory/api-client';
import { Action } from './Controls';
import { IconAction } from './IconAction';
import { Text } from './Themed';
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
  const { preferences } = useTheme();
  const page = Math.floor(offset / pageSize) + 1,
    last = total === undefined ? page + Number(hasMore) : Math.max(1, Math.ceil(total / pageSize));
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
    <View
      accessibilityLabel={`${label} pagination`}
      style={{
        flexDirection: 'row',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <IconAction
        label={`Previous ${label}`}
        icon="‹"
        disabled={busy || !offset}
        onPress={() => onChange(Math.max(0, offset - pageSize))}
      />
      {paginationPages(page, last).map((n, i) =>
        n === 'gap' ? (
          <Text key={`gap-${i}`}>…</Text>
        ) : (
          <Action
            key={n}
            label={String(n)}
            accessibilityLabel={`Page ${n}${n === page ? ', current page' : ''}`}
            disabled={busy}
            variant={n === page ? 'default' : 'ghost'}
            onPress={() => onChange((n - 1) * pageSize)}
          />
        ),
      )}
      {total === undefined && hasMore && (
        <Text accessibilityLabel="More pages may be available">…</Text>
      )}
      <IconAction
        label={`Next ${label}`}
        icon="›"
        disabled={busy || !hasMore}
        onPress={() => onChange(offset + pageSize)}
      />
    </View>
  );
}
