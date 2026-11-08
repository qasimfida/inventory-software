import {
  importTemplatesSchema,
  importTemplateSchema,
  importValidationSchema,
} from '@inventory/contracts';
import type { ImportTemplate, ImportTemplateInput } from '@inventory/contracts';
import { importInputSchema, importResultSchema } from '@inventory/contracts';
import type { ImportInput } from '@inventory/contracts';
import type { OrganizationTransport } from './organization.js';
export const importProducts = async (
  request: OrganizationTransport,
  businessId: string,
  input: ImportInput,
) =>
  importResultSchema.parse(
    await request(
      `/${encodeURIComponent(businessId)}/imports/products`,
      'POST',
      importInputSchema.parse(input),
    ),
  );

export function createImportClient(request: OrganizationTransport, businessId: string) {
  const root = `/${encodeURIComponent(businessId)}/imports`;
  return {
    templates: async () => importTemplatesSchema.parse(await request(`${root}/templates`)).items,
    saveTemplate: async (input: ImportTemplateInput, current?: ImportTemplate) =>
      importTemplateSchema.parse(
        await request(
          `${root}/templates${current ? `/${current.id}` : ''}`,
          current ? 'PATCH' : 'POST',
          current ? { ...input, version: current.version } : input,
        ),
      ),
    deleteTemplate: async (current: ImportTemplate) => {
      await request(`${root}/templates/${current.id}?version=${current.version}`, 'DELETE');
    },
    validate: async (input: ImportInput) =>
      importValidationSchema.parse(
        await request(`${root}/products/validate`, 'POST', importInputSchema.parse(input)),
      ),
    execute: (input: ImportInput) => importProducts(request, businessId, input),
  };
}
