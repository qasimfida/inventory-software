import { createHashRouter } from 'react-router-dom';
import { RouteError } from './RouteError';
import { RouteLoading } from './RouteLoading';

// Hash routing also works in the packaged desktop shell without server rewrites.
export const router = createHashRouter([
  {
    path: '/',
    HydrateFallback: RouteLoading,
    lazy: async () => {
      const { FoundationPage } = await import('@/features/foundation/FoundationPage');
      return { Component: FoundationPage };
    },
    errorElement: <RouteError />,
  },
]);
