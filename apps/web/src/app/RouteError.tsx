import { ErrorState } from '@/components/common/AsyncState';

export function RouteError() {
  return (
    <main className="mx-auto max-w-3xl space-y-6 p-6">
      <h1 className="text-2xl font-semibold">Unable to open this page</h1>
      <ErrorState
        message="Check your connection and application configuration."
        onRetry={() => window.location.reload()}
      />
    </main>
  );
}
