import { LoadingState } from '@/components/common/AsyncState';
import { Page } from '@/components/common/Layout';

export function RouteLoading() {
  return (
    <Page>
      <LoadingState message="Opening the application…" />
    </Page>
  );
}
