// @vitest-environment jsdom
import { afterEach, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { RegistrationTrend } from './RegistrationTrend';
afterEach(cleanup);
it('keeps real registration counts accessible without a daily figures accordion', () => {
  render(<RegistrationTrend rows={[{ date: '2026-10-22', count: '3' }]} />);
  expect(screen.getByRole('img').getAttribute('aria-labelledby')).toBeTruthy();
  expect(screen.getByRole('img').textContent).toContain('2026-10-22: 3');
  expect(screen.queryByRole('button', { name: 'View daily figures' })).toBeNull();
});
it('shows an honest empty state when no registration history exists', () => {
  render(<RegistrationTrend rows={[]} />);
  expect(screen.getByText('No registration history available.')).toBeTruthy();
  expect(screen.queryByRole('img')).toBeNull();
});
