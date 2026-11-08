// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';
import { SecurityEvents } from './SecurityEvents';
it('opens readable event details from the loaded record', () => {
  render(
    <SecurityEvents
      events={[
        {
          id: '1',
          occurredAt: '2026-11-03T09:40:00Z',
          actorId: 'user-id',
          actorName: 'Jane',
          businessId: null,
          deviceId: null,
          sessionId: null,
          event: 'login.success',
          outcome: 'success',
          requestId: 'support-reference',
          policyChange: null,
        },
      ]}
    />,
  );
  expect(screen.getByText('Login attempt')).toBeTruthy();
  expect(screen.getByText('Jane')).toBeTruthy();
  expect(screen.queryByText('user-id')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'View details' }));
  expect(screen.getByText('The account signed in successfully.')).toBeTruthy();
  expect(screen.getByText('Date and time')).toBeTruthy();
  expect(screen.queryByText('login.success')).toBeNull();
});
