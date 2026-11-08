// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createCatalogClient } from '@inventory/api-client';
import { ProductCategory } from './ProductCategory';
afterEach(cleanup);
it('creates and selects a category without submitting the enclosing product form', async () => {
  const id = '00000000-0000-4000-8000-000000000001';
  const request = vi
    .fn()
    .mockResolvedValue({ id, name: 'New category', parentId: null, state: 'active', version: 1 });
  const select = vi.fn(),
    submit = vi.fn();
  render(
    <form onSubmit={submit}>
      <ProductCategory
        categories={[]}
        client={createCatalogClient(request, id)}
        value=""
        onChange={select}
        canCreate
        disabled={false}
      />
    </form>,
  );
  const user = userEvent.setup();
  await user.click(screen.getByRole('combobox', { name: 'Find or create category' }));
  await user.click(screen.getByRole('option', { name: 'Create category' }));
  await user.type(screen.getByLabelText('Category name'), 'New category');
  await user.click(screen.getByRole('button', { name: 'Create category' }));
  expect(request).toHaveBeenCalledWith(`/${id}/categories`, 'POST', {
    name: 'New category',
    parentId: null,
    state: 'active',
  });
  expect(select).toHaveBeenCalledWith(id);
  expect(submit).not.toHaveBeenCalled();
});
it('does not offer creation without permission', async () => {
  render(
    <ProductCategory
      categories={[]}
      client={createCatalogClient(vi.fn(), 'business')}
      value=""
      onChange={() => {}}
      canCreate={false}
      disabled={false}
    />,
  );
  await userEvent.click(screen.getByRole('combobox', { name: 'Find or create category' }));
  expect(screen.queryByRole('option', { name: 'Create category' })).toBeNull();
});
