// @vitest-environment jsdom
import { afterEach, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SkuProductHint, SkuStatusIcon } from './SkuStatus';
afterEach(cleanup);
it('shows an available checkmark with keyboard tooltip and no icon while checking', async () => {
  const { rerender } = render(<SkuStatusIcon feedback={{ value: 'NEW', state: 'checking' }} />);
  expect(screen.queryByRole('button')).toBeNull();
  rerender(<SkuStatusIcon feedback={{ value: 'NEW', state: 'available' }} />);
  await userEvent.tab();
  expect(screen.getByRole('button', { name: 'SKU ID is available.' })).toBe(document.activeElement);
  await screen.findByRole('tooltip');
});
it('opens the actual product preview on hover and exposes only the supplied projection', async () => {
  render(
    <SkuProductHint
      feedback={{
        value: 'TAKEN',
        state: 'duplicate',
        product: {
          id: '00000000-0000-4000-8000-000000000001',
          name: 'Existing mug',
          sku: 'MUG',
          image: null,
        },
      }}
    />,
  );
  await userEvent.hover(screen.getByRole('button', { name: 'View existing SKU product' }));
  const tooltip = await screen.findByRole('tooltip');
  expect(tooltip.textContent).toContain('Existing mug');
  expect(tooltip.textContent).toContain('SKU: MUG');
});
it('does not invent a product when the user cannot read it', async () => {
  render(<SkuProductHint feedback={{ value: 'TAKEN', state: 'duplicate' }} />);
  await userEvent.click(screen.getByRole('button', { name: 'View existing SKU product' }));
  expect((await screen.findByRole('tooltip')).textContent).toContain(
    'unavailable for your access level',
  );
});
