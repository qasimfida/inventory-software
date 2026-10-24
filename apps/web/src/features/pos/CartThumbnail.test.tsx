// @vitest-environment jsdom
import { afterEach, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { CartThumbnail } from './CartThumbnail';
afterEach(cleanup);
it('shows an actual image and falls back on a failed image', () => {
  render(<CartThumbnail uri="https://example.com/product.png" name="Mug" />);
  const image = screen.getByRole('img', { name: 'Mug' });
  expect(image.getAttribute('referrerpolicy')).toBe('no-referrer');
  fireEvent.error(image);
  expect(screen.queryByRole('img', { name: 'Mug' })).toBeNull();
  expect(screen.getByLabelText('No image for Mug')).toBeTruthy();
});
it('shows a fallback when the product has no image', () => {
  render(<CartThumbnail uri={undefined} name="Mug" />);
  expect(screen.getByLabelText('No image for Mug')).toBeTruthy();
});
