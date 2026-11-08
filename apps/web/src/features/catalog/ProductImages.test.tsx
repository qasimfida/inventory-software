// @vitest-environment jsdom
import { useState } from 'react';
import { afterEach, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProductImages } from './ProductImages';
afterEach(cleanup);
function Demo() {
  const [images, setImages] = useState([
    'https://example.test/first.png',
    'https://example.test/second.png',
  ]);
  return (
    <>
      <ProductImages value={images} onChange={setImages} />
      <output>{images.join(',')}</output>
    </>
  );
}
it('rejects unsafe URLs, preserves order and supports replacement and removal', async () => {
  render(<Demo />);
  const user = userEvent.setup();
  await user.type(screen.getByLabelText('Image HTTPS URL'), 'javascript:alert(1)');
  await user.click(screen.getByRole('button', { name: 'Add image URL' }));
  expect(screen.getByRole('alert').textContent).toContain('HTTPS');
  expect(screen.getByRole('status').textContent).toContain(
    'first.png,https://example.test/second.png',
  );
  await user.click(screen.getByRole('button', { name: 'Move image 2 earlier' }));
  expect(screen.getByRole('status').textContent).toMatch(/^https:\/\/example.test\/second.png/);
  await user.click(screen.getByRole('button', { name: 'Replace image 1' }));
  const input = screen.getByLabelText('Replace image 1 URL');
  await user.clear(input);
  await user.type(input, 'https://example.test/replaced.png');
  await user.click(screen.getByRole('button', { name: 'Replace image' }));
  fireEvent.error(screen.getByRole('img', { name: 'Product preview 1' }));
  expect(screen.getByRole('img', { name: 'Image 1 unavailable' })).toBeTruthy();
  expect(screen.getByRole('status').textContent).toContain('replaced.png');
  await user.click(screen.getByRole('button', { name: 'Remove image 1' }));
  expect(screen.getByRole('status').textContent).toBe('https://example.test/first.png');
});
it('retains existing images after failed file upload and clears its busy state', async () => {
  const { vi } = await import('vitest');
  const upload = vi.fn().mockRejectedValue(new Error('Offline'));
  const onChange = vi.fn(),
    onBusyChange = vi.fn();
  render(
    <ProductImages
      value={['https://example.test/keep.png']}
      onChange={onChange}
      upload={upload}
      onBusyChange={onBusyChange}
    />,
  );
  const user = userEvent.setup();
  await user.upload(
    screen.getByLabelText(/Upload product image/),
    new File(['png'], 'photo.png', { type: 'image/png' }),
  );
  expect(await screen.findByRole('alert')).toBeTruthy();
  expect(onChange).not.toHaveBeenCalled();
  expect(onBusyChange.mock.calls.map((call) => call[0])).toEqual([true, false]);
  expect(screen.getByRole('img', { name: 'Product preview 1' })).toBeTruthy();
});
