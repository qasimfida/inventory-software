// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { NotificationTable } from './NotificationTable';
afterEach(cleanup);
it('shows readable loaded details and preserves read/unread/delete actions', () => {
  const read = vi.fn(),
    unread = vi.fn(),
    dismiss = vi.fn();
  const item = {
    id: 'notice',
    event: 'transfer.receive',
    actorName: 'Jane',
    resourceId: 'record',
    warehouseId: 'warehouse',
    createdAt: '2026-11-03T09:40:00Z',
    readAt: '2026-11-03T10:00:00Z',
  };
  render(
    <NotificationTable
      items={[item]}
      busy={false}
      timeZone="Asia/Karachi"
      onRead={read}
      onUnread={unread}
      onDismiss={dismiss}
    />,
  );
  fireEvent.click(screen.getByRole('button', { name: 'Transfer received' }));
  expect(
    screen.getByText(
      'A warehouse transfer was received. Its receipt and stock movements are recorded in transfer history.',
    ),
  ).toBeTruthy();
  expect(screen.getByText(/Tuesday, November 3, 2026 at 2:40:00 PM/)).toBeTruthy();
  expect(screen.getByText('Warehouse reference')).toBeTruthy();
  expect(screen.getByText('Read on')).toBeTruthy();
  expect(read).not.toHaveBeenCalled();
  expect(unread).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Mark unread' }));
  expect(unread).toHaveBeenCalledWith('notice');
  fireEvent.click(screen.getByRole('button', { name: 'Delete from my inbox' }));
  expect(dismiss).toHaveBeenCalledWith('notice');
});
