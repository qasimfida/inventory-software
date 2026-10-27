import { useNavigate } from 'react-router-dom';
import type { useOnlineCollection } from './useOnlineCollection';
import { OnlineBulkResult } from './OnlineBulkResult';
export function OnlineCollectionFeedback({
  channels,
}: {
  channels: ReturnType<typeof useOnlineCollection>;
}) {
  return (
    <>
      {channels.error && <p role="status">{channels.error}</p>}
      {channels.result && <ResultFeedback channels={channels} />}
    </>
  );
}
function ResultFeedback({ channels }: { channels: ReturnType<typeof useOnlineCollection> }) {
  const navigate = useNavigate();
  return channels.result ? (
    <OnlineBulkResult
      result={channels.result}
      onClose={channels.clearResult}
      onOpen={(id) => {
        channels.clearResult();
        void navigate('/online-store/products/' + id);
      }}
      onTab={(tab) => {
        channels.clearResult();
        void navigate('/online-store/products?tab=' + tab);
      }}
    />
  ) : null;
}
