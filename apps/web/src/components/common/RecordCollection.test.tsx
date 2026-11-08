// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
const save = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
vi.mock('@/platform/files', () => ({ saveLocalText: save }));
import { RecordCollection } from './RecordCollection';
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});
it('exports original evidence while rendering an indicative equivalent', async () => {
  render(
    <RecordCollection
      label="Costs"
      onOpen={() => {}}
      items={[
        {
          id: 'cost',
          title: 'Delivery',
          subtitle: 'Transport',
          status: 'Open',
          tone: 'neutral',
          detail: '$3.00 (≈ PKR 840.00)',
          exportDetail: '$3.00',
        },
      ]}
    />,
  );
  expect(screen.getByText('$3.00 (≈ PKR 840.00)')).toBeTruthy();
  await userEvent.click(screen.getByRole('button', { name: 'Export shown records' }));
  expect(save).toHaveBeenCalledTimes(1);
  expect(save.mock.calls[0]![1]).toContain('$3.00');
  expect(save.mock.calls[0]![1]).not.toContain('PKR');
});
