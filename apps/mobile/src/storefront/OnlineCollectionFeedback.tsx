import { useNavigation } from '../shell/Navigation';
import { Text } from '../ui/Themed';
import type { useOnlineCollection } from './useOnlineCollection';
import { OnlineBulkResult } from './OnlineBulkResult';
export function OnlineCollectionFeedback({
  channels,
}: {
  channels: ReturnType<typeof useOnlineCollection>;
}) {
  return (
    <>
      {!!channels.error && <Text accessibilityLiveRegion="polite">{channels.error}</Text>}
      {channels.result && <ResultFeedback channels={channels} />}
    </>
  );
}
function ResultFeedback({ channels }: { channels: ReturnType<typeof useOnlineCollection> }) {
  const { navigate } = useNavigation();
  return channels.result ? (
    <OnlineBulkResult
      result={channels.result}
      onClose={channels.clearResult}
      onOpen={(id) => {
        channels.clearResult();
        navigate('/online-store/products/' + id);
      }}
      onTab={(tab) => {
        channels.clearResult();
        navigate('/online-store/products?tab=' + tab);
      }}
    />
  ) : null;
}
