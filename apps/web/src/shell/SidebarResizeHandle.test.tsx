// @vitest-environment jsdom
import { useState } from 'react';
import { afterEach, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SidebarResizeHandle } from './SidebarResizeHandle';
afterEach(cleanup);
it('supports bounded keyboard resizing without account preference mutations', async () => {
  function Example() {
    const [width, setWidth] = useState(248);
    return <SidebarResizeHandle width={width} onChange={setWidth} />;
  }
  render(<Example />);
  const separator = screen.getByRole('separator', { name: 'Resize sidebar' });
  separator.focus();
  await userEvent.keyboard('{ArrowRight}');
  expect(separator.getAttribute('aria-valuenow')).toBe('264');
  await userEvent.keyboard('{Home}{ArrowLeft}');
  expect(separator.getAttribute('aria-valuenow')).toBe('208');
  await userEvent.keyboard('{End}{ArrowRight}');
  expect(separator.getAttribute('aria-valuenow')).toBe('384');
});
