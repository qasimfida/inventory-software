// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Report } from '@inventory/contracts';
const save = vi.hoisted(() => vi.fn());
vi.mock('@/platform/files', () => ({ saveLocalText: save }));
import { ReportResults } from './ReportResults';
const data: Report = {
  section: 'sales',
  from: '2026-10-01',
  to: '2026-10-31',
  asOf: '2026-11-01T00:00:00.000Z',
  offset: 50,
  hasMore: true,
  notes: ['Currencies are never combined.'],
  rows: [
    { key: 'usd', label: 'Net revenue', value: '9007199254740993', unit: 'USD minor units' },
    { key: 'pkr', label: 'Returns', value: '-42', unit: 'PKR minor units' },
  ],
};
afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});
it('shows exact per-unit evidence, partial results and notes without arithmetic', () => {
  render(<ReportResults data={data} />);
  const table = screen.getByRole('table');
  expect(within(table).getByText('$90071992547409.93')).toBeTruthy();
  expect(within(table).getByText('PKR -0.42 · USD estimate unavailable')).toBeTruthy();
  expect(within(table).getByText('USD (original)')).toBeTruthy();
  expect(within(table).getByText('PKR (original)')).toBeTruthy();
  expect(screen.getByText('More rows available')).toBeTruthy();
  expect(screen.getByText('Currencies are never combined.')).toBeTruthy();
});
it('exports only shown rows with unchanged columns and exact response dates', async () => {
  render(<ReportResults data={data} />);
  await userEvent.click(screen.getByRole('button', { name: 'Export shown rows' }));
  expect(save).toHaveBeenCalledTimes(1);
  const [name, csv, mime] = save.mock.calls[0]!;
  expect(name).toBe('report-shown.csv');
  expect(mime).toBe('text/csv');
  expect(csv).toContain('9007199254740993');
  expect(csv).toContain('2026-11-01T00:00:00.000Z');
  expect(csv.trim().split('\n')).toHaveLength(3);
});
it('explains empty results and disables export', () => {
  render(<ReportResults data={{ ...data, rows: [], hasMore: false }} />);
  expect(screen.getByText('No matching records for this report.')).toBeTruthy();
  expect(screen.queryByRole('table')).toBeNull();
  expect(screen.getByRole('button', { name: 'Export shown rows' })).toHaveProperty(
    'disabled',
    true,
  );
});
it('exposes export failures without claiming a saved file', async () => {
  save.mockRejectedValue(new Error('cancelled'));
  render(<ReportResults data={data} />);
  await userEvent.click(screen.getByRole('button', { name: 'Export shown rows' }));
  expect(await screen.findByRole('alert')).toHaveProperty(
    'textContent',
    'Unable to export. Try again.',
  );
});
