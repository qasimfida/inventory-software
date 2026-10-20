import {
  productPageSchema,
  productSchema,
  categoriesSchema,
  categorySchema,
} from '@inventory/contracts';
import type {
  ProductInput,
  ProductEdit,
  CategoryInput,
  CategoryEdit,
  CatalogQuery,
} from '@inventory/contracts';
import type { OrganizationTransport } from './organization.js';
export function queryString(query: object) {
  return Object.entries(query)
    .filter(([, v]) => v !== undefined)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join('&');
}
export function createCatalogClient(request: OrganizationTransport, businessId: string) {
  const path = `/${encodeURIComponent(businessId)}`;
  return {
    list: async (query: CatalogQuery) =>
      productPageSchema.parse(await request(`${path}/products?${queryString(query)}`)),
    categories: async () => categoriesSchema.parse(await request(`${path}/categories`)).items,
    create: async (input: ProductInput) =>
      productSchema.parse(await request(`${path}/products`, 'POST', input)),
    edit: async (id: string, input: ProductEdit) =>
      productSchema.parse(
        await request(`${path}/products/${encodeURIComponent(id)}`, 'PATCH', input),
      ),
    createCategory: async (input: CategoryInput) =>
      categorySchema.parse(await request(`${path}/categories`, 'POST', input)),
    editCategory: async (id: string, input: CategoryEdit) =>
      categorySchema.parse(
        await request(`${path}/categories/${encodeURIComponent(id)}`, 'PATCH', input),
      ),
  };
}
