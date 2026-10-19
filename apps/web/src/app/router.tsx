import { createHashRouter } from 'react-router-dom';
import { RouteError } from './RouteError';

// Hash routing also works in the packaged desktop shell without server rewrites.
export const router = createHashRouter([
  {
    path: '/',
    lazy: async () => {
      const { FoundationPage } = await import('@/features/foundation/FoundationPage');
      return { Component: FoundationPage };
    },
    errorElement: <RouteError />,
  },
]);
