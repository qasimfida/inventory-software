import { z } from 'zod';
export const industryProfileSchema = z
  .object({
    schemaVersion: z.literal(1),
    kind: z.enum(['general', 'retail', 'wholesale']),
    lowStockThreshold: z.string().regex(/^\d{1,12}(\.\d{1,6})?$/),
  })
  .strict();
export type IndustryProfile = z.infer<typeof industryProfileSchema>;
export const defaultIndustry: IndustryProfile = {
  schemaVersion: 1,
  kind: 'general',
  lowStockThreshold: '0',
};
export const industryConventions = {
  general: { label: 'General business', customer: 'Customers', purchase: 'Purchases' },
  retail: {
    label: 'Retail',
    customer: 'Shoppers / customers',
    purchase: 'Replenishment purchases',
  },
  wholesale: { label: 'Wholesale', customer: 'Trade customers', purchase: 'Supply purchases' },
} as const;
