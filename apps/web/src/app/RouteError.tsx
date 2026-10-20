import { Page } from '@/components/common/Layout';
import { ErrorState } from '@/components/common/AsyncState';

export function RouteError() {
  return (
    <Page className="max-w-3xl">
      <h1>Unable to open this page</h1>
      <ErrorState
        message="Check your connection and application configuration."
        onRetry={() => window.location.reload()}
      />
    </Page>
  );
}
