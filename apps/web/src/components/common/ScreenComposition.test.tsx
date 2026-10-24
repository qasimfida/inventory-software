// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ScreenHeader } from './ScreenHeader';
import { RecordDetails } from './RecordDetails';
import { Button } from '../ui/Button';
afterEach(cleanup);
it('preserves exact transaction values and caller-owned keyboard actions', async () => {
  const refresh = vi.fn();
  render(
    <section>
      <ScreenHeader
        title="Purchase details"
        level={3}
        description="Confirmed receipts"
        actions={<Button onClick={refresh}>Refresh purchase</Button>}
      />
      <RecordDetails
        label="Receipt facts"
        items={[
          { label: 'Quantity', value: '1234.567890' },
          { label: 'Amount (USD minor units)', value: '9007199254740993' },
          { label: 'Reference', value: 'receipt-with-a-long-source-reference-kept-in-full' },
        ]}
      />
    </section>,
  );
  expect(screen.getByRole('heading', { name: 'Purchase details', level: 3 })).toBeTruthy();
  const facts = screen.getByLabelText('Receipt facts');
  expect(facts.tagName).toBe('DL');
  expect(within(facts).getByText('1234.567890').tagName).toBe('DD');
  expect(within(facts).getByText('9007199254740993')).toBeTruthy();
  expect(within(facts).getByText('receipt-with-a-long-source-reference-kept-in-full')).toBeTruthy();
  await userEvent.tab();
  await userEvent.keyboard('{Enter}');
  expect(refresh).toHaveBeenCalledTimes(1);
});
