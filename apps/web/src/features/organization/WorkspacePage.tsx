import { Page } from '@/components/common/Layout';
import { AuthPanel } from '../auth/AuthPanel';

export function WorkspacePage() {
  return (
    <Page className="max-w-none space-y-4 py-4 sm:py-4">
      <AuthPanel />
    </Page>
  );
}
