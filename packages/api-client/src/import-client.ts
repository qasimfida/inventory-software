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
