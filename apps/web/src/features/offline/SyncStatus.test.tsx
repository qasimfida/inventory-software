// @vitest-environment jsdom
import { afterEach, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { syncActivity } from '@inventory/api-client';
import { SyncStatus } from './SyncStatus';
afterEach(cleanup);
it('publishes only confirmed progress, exposes a result and clears activity when locked', async () => {
  const view = render(
    <SyncStatus
      state={{
        data: null,
        error: '',
        busy: false,
        sync: { phase: 'uploading', total: 4, confirmed: 1, remaining: 3 },
      }}
    />,
  );
  expect(screen.getByRole('progressbar').getAttribute('aria-valuenow')).toBe('25');
  expect(syncActivity.snapshot()?.progress.confirmed).toBe(1);
  expect(screen.queryByText(/Sync complete:/)).toBeNull();
  view.rerender(
    <SyncStatus
      state={{
        data: null,
        error: '',
        busy: false,
        sync: { phase: 'complete', total: 4, confirmed: 4, remaining: 0 },
      }}
    />,
  );
  expect(screen.getByText('Sync complete: 4 records confirmed by the server.')).toBeTruthy();
  await userEvent.click(screen.getByRole('button', { name: 'View result' }));
  expect(screen.getByRole('dialog', { name: 'Synchronization details' })).toBeTruthy();
  view.unmount();
  expect(syncActivity.snapshot()).toBeNull();
});
it('keeps partial failures visible and never labels them complete', () => {
  render(
    <SyncStatus
      state={{
        data: null,
        error: 'Upload interrupted',
        busy: false,
        sync: { phase: 'attention', total: 4, confirmed: 1, remaining: 3 },
      }}
    />,
  );
  expect(
    screen.getByText('Sync needs attention: 3 records still await confirmation.'),
  ).toBeTruthy();
  expect(screen.queryByText('Synchronization complete')).toBeNull();
});
