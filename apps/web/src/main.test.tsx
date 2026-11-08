// @vitest-environment jsdom
import { expect, it, vi } from 'vitest';

vi.mock('./platform/auth-client', () => ({
  authClient: {
    current: async () => {
      const { AuthenticationError } = await import('@inventory/api-client');
      throw new AuthenticationError(401);
    },
  },
}));

it('mounts the real browser entry point and resolves its lazy route and shared imports', async () => {
  document.body.innerHTML = '<div id="root"></div>';
  await import('./main');
  // The real lazy entry loads the application graph; allow the same bounded budget as async UI tests under full-suite contention.
  await vi.waitFor(() => expect(document.querySelector('h1')?.textContent).toContain('Sign in'), {
    timeout: 5000,
  });
  expect(
    [...document.querySelectorAll('button')].some((button) =>
      button.textContent?.includes('Log in'),
    ),
  ).toBe(true);
  expect(document.querySelector('#auth-email')).not.toBeNull();
  expect(document.querySelector('#preview-label')).toBeNull();
});
