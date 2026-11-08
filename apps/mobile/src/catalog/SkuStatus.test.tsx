// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
vi.mock('react-native', () => vi.importActual('react-native-web'));
import { SkuStatus } from './SkuStatus';
afterEach(cleanup);
it('opens a native preview by touch without relying on hover', async () => {
  render(
    <SkuStatus
      preview
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
  await userEvent.click(screen.getByRole('button', { name: 'View existing SKU product' }));
  expect(screen.getByText('Existing mug')).toBeTruthy();
});
