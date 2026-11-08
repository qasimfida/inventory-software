// @vitest-environment jsdom
// The Expo picker requires a device; these tests exercise forms, not the native picker host.
vi.mock('expo-image-picker', () => ({ launchImageLibraryAsync: vi.fn() }));
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
vi.mock('react-native-safe-area-context', () => import('../ui/safe-area-test-adapter'));
vi.mock('../ui/RichTextEditor', () => import('../ui/RichTextEditor.web'));
vi.mock('react-native', () => vi.importActual('react-native-web'));
import { createCatalogClient } from '@inventory/api-client';
import { ProductForm } from './ProductForm';
afterEach(cleanup);
it('shows duplicate SKU feedback in native controls before a write', async () => {
  const request = vi.fn().mockResolvedValue({ available: false });
  render(
    <ProductForm
      product={null}
      categories={[]}
      client={createCatalogClient(request, 'business')}
      run={(work) => {
        void work();
      }}
      cancel={() => {}}
    />,
  );
  await userEvent.type(screen.getByLabelText('SKU'), 'TAKEN');
  await screen.findByText('SKU ID already exists.');
  expect(screen.getByLabelText('SKU').getAttribute('aria-invalid')).toBe('true');
  expect(screen.getByRole('button', { name: 'Save product' }).getAttribute('aria-disabled')).toBe(
    'true',
  );
  expect(request.mock.calls.every((call) => call[1] === 'GET')).toBe(true);
});
it('rejects an invalid image URL while retaining product and image drafts', async () => {
  const request = vi.fn().mockResolvedValue({ available: true });
  render(
    <ProductForm
      product={null}
      categories={[]}
      client={createCatalogClient(request, 'business')}
      run={() => {}}
      cancel={() => {}}
    />,
  );
  await userEvent.type(screen.getByLabelText('Product name'), 'Draft mug');
  await userEvent.click(screen.getByRole('button', { name: 'Images and product codes' }));
  await userEvent.type(screen.getByLabelText('Image HTTPS URL'), 'http://invalid.test/image');
  await userEvent.click(screen.getByRole('button', { name: 'Add image URL' }));
  expect(
    await screen.findByText(
      'Use an HTTPS image URL without credentials, up to 500 characters. Maximum five images.',
    ),
  ).toBeTruthy();
  expect(screen.getByLabelText('Product name').getAttribute('value')).toBe('Draft mug');
  expect(screen.getByLabelText('Image HTTPS URL').getAttribute('value')).toBe(
    'http://invalid.test/image',
  );
  expect(request.mock.calls.every((call) => call[1] === 'GET')).toBe(true);
  await userEvent.clear(screen.getByLabelText('Image HTTPS URL'));
  await userEvent.type(screen.getByLabelText('Image HTTPS URL'), 'https://valid.test/image');
  await userEvent.click(screen.getByRole('button', { name: 'Add image URL' }));
  await waitFor(() =>
    expect(screen.getByLabelText('Image HTTPS URL').getAttribute('value')).toBe(''),
  );
  expect(screen.getByRole('button', { name: 'Remove image 1' })).toBeTruthy();
});
