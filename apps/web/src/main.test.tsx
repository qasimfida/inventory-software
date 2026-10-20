// @vitest-environment jsdom
import { expect, it, vi } from 'vitest';

it('mounts the real browser entry point and resolves its lazy route and shared imports', async () => {
  document.body.innerHTML = '<div id="root"></div>';
  await import('./main');
  await vi.waitFor(() => expect(document.querySelector('h1')?.textContent).toContain('Inventory'));
  expect(
    [...document.querySelectorAll('button')].some((button) =>
      button.textContent?.includes('Check'),
    ),
  ).toBe(true);
});
