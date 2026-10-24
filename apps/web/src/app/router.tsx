import { createHashRouter } from 'react-router-dom';
import { RouteError } from './RouteError';
import { captureWebAuthLink } from '@/features/auth/link-state';
import { RouteLoading } from './RouteLoading';

captureWebAuthLink();

// Hash routing also works in the packaged desktop shell without server rewrites.
export const router = createHashRouter([
  {
    path: '*',
    HydrateFallback: RouteLoading,
    lazy: async () => {
      const { Application } = await import('@/shell/Application');
      return { Component: Application };
    },
    errorElement: <RouteError />,
  },
  {
    path: '/design-system',
    HydrateFallback: RouteLoading,
    lazy: async () => {
      const { FoundationPage } = await import('@/features/foundation/FoundationPage');
      return { Component: FoundationPage };
    },
    errorElement: <RouteError />,
  },
]);
