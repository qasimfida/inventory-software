// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { AuditHistory } from './AuditHistory';
afterEach(cleanup);
it('opens exact loaded evidence without refreshing or interpreting monetary values', () => {
  const refresh = vi.fn();
  render(
    <AuditHistory
      timeZone="Asia/Karachi"
      onRefresh={refresh}
      events={[
        {
          id: 'event',
          actorId: 'actor',
          actorEmail: 'owner@example.test',
          resourceId: 'record',
          action: 'stock.adjust',
          storeId: null,
          warehouseId: 'warehouse',
          requestId: 'request',
          occurredAt: '2026-11-03T09:40:00Z',
          before: { quantity: '9007199254740993', enabled: false },
          after: { quantity: '0' },
        },
      ]}
    />,
  );
  fireEvent.click(screen.getByRole('button', { name: 'View change details' }));
  const dialog = screen.getByRole('dialog');
  expect(dialog.textContent).toContain('Tuesday, November 3, 2026 at 2:40:00 PM');
  expect(dialog.textContent).toContain('Before · quantity');
  expect(dialog.textContent).toContain('9007199254740993');
  expect(dialog.textContent).toContain('false');
  expect(dialog.querySelector('pre')).toBeNull();
  expect(refresh).not.toHaveBeenCalled();
});
