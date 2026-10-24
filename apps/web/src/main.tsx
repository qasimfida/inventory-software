import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { router } from './app/router';
import './styles.css';
import { AppearanceProvider } from './theme/Appearance';

const root = document.getElementById('root');
if (!root) throw new Error('Missing application root.');
createRoot(root).render(
  <StrictMode>
    <AppearanceProvider>
      <RouterProvider router={router} />
    </AppearanceProvider>
  </StrictMode>,
);

if (import.meta.env.PROD && 'serviceWorker' in navigator && !('__TAURI_INTERNALS__' in window)) {
  void navigator.serviceWorker.register('./sw.js').catch(() => {
    /* Offline preparation reports persistence independently. */
  });
}
