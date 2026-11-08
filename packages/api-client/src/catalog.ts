import type { CancellationSignal } from './cancellation.js';
import {
  productImageUploadSchema,
  productImageUploadResultSchema,
  productPageSchema,
  skuAvailabilitySchema,
  productSchema,
  categoriesSchema,
  categorySchema,
} from '@inventory/contracts';
import type {
  ProductImageUpload,
  ProductInput,
  ProductEdit,
  CategoryInput,
  CategoryEdit,
  CatalogQuery,
  SkuAvailabilityQuery,
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
    uploadImage: async (input: ProductImageUpload) =>
      productImageUploadResultSchema.parse(
        await request(`${path}/product-images`, 'POST', productImageUploadSchema.parse(input)),
      ),
    skuAvailability: async (query: SkuAvailabilityQuery, signal?: CancellationSignal) =>
      skuAvailabilitySchema.parse(
        await request(
          `${path}/products/sku-availability?${queryString(query)}`,
          'GET',
          undefined,
          signal,
        ),
      ),
    list: async (query: CatalogQuery, signal?: CancellationSignal) =>
      productPageSchema.parse(
        await request(`${path}/products?${queryString(query)}`, 'GET', undefined, signal),
      ),
    get: async (id: string) =>
      productSchema.parse(await request(`${path}/products/${encodeURIComponent(id)}`)),
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
