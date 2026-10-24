// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as Tabs from '@radix-ui/react-tabs';
import { OverflowTabs } from './OverflowTabs';
import { ViewTabs } from './ViewTabs';
import { Button } from '../ui/Button';
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
it('keeps tab selection and exposes directional overflow without a scrollbar', async () => {
  vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(200);
  vi.spyOn(HTMLElement.prototype, 'scrollWidth', 'get').mockReturnValue(600);
  const { container } = render(
    <Tabs.Root defaultValue="first">
      <OverflowTabs>
        <Tabs.List aria-label="Example tabs">
          <Tabs.Trigger value="first">First</Tabs.Trigger>
          <Tabs.Trigger value="second">Second</Tabs.Trigger>
        </Tabs.List>
      </OverflowTabs>
      <Tabs.Content value="first">First panel</Tabs.Content>
      <Tabs.Content value="second">Second panel</Tabs.Content>
    </Tabs.Root>,
  );
  const list = screen.getByRole('tablist');
  list.scrollBy = vi.fn();
  await userEvent.click(screen.getByRole('button', { name: 'Scroll settings tabs right' }));
  expect(list.scrollBy).toHaveBeenCalledWith({ left: 140, behavior: 'auto' });
  list.scrollLeft = 400;
  fireEvent.scroll(list);
  expect(container.querySelector('.overflow-tabs')?.getAttribute('data-right')).toBe('false');
  expect(container.querySelector('.overflow-tabs')?.getAttribute('data-left')).toBe('true');
  await userEvent.click(screen.getByRole('tab', { name: 'Second' }));
  expect(screen.getByRole('tabpanel').textContent).toBe('Second panel');
});
it('gives icon controls a portalled keyboard tooltip without a native title', async () => {
  render(
    <Button size="icon" aria-label="Inspect status">
      <span aria-hidden="true">i</span>
    </Button>,
  );
  const user = userEvent.setup();
  await user.tab();
  expect(await screen.findByRole('tooltip')).toBeTruthy();
  expect(screen.getByRole('button').hasAttribute('title')).toBe(false);
  await user.keyboard('{Escape}');
  expect(screen.queryByRole('tooltip')).toBeNull();
});

it('does not let tooltip state overwrite selected list/grid tab styling', async () => {
  render(<ViewTabs panelId="records" value="grid" onChange={() => {}} />);
  const selected = screen.getByRole('tab', { name: 'View grid view' });
  expect(selected.getAttribute('data-state')).toBe('active');
  await userEvent.hover(selected);
  expect(selected.getAttribute('data-state')).toBe('active');
});
