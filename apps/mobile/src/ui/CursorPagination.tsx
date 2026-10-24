import { useTheme } from '../theme';
import { View } from 'react-native';
import { Action } from './Controls';
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
  const { preferences } = useTheme();
  if (preferences.pagination === 'scroll')
    return <LoadMore label={label} hasMore={hasMore} busy={busy} onLoad={onNext} />;
  if (!hasMore && !previous) return null;
  return (
    <View>
      {previous && onReset && (
        <Action variant="ghost" disabled={busy} onPress={onReset} label={`Newest ${label}`} />
      )}
      {hasMore && (
        <Action variant="ghost" disabled={busy} onPress={onNext} label={`More ${label}`} />
      )}
    </View>
  );
}
