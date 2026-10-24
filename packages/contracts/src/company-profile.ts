import { z } from 'zod';
const optionalText = (max: number) => z.string().trim().max(max).default('');
export const companyProfileSchema = z
  .object({
    displayName: optionalText(120),
    legalName: optionalText(160),
    email: z.union([z.email(), z.literal('')]).default(''),
    phone: optionalText(40),
    address: optionalText(500),
    website: z.union([z.url({ protocol: /^https$/ }), z.literal('')]).default(''),
    description: optionalText(1000),
    logo: z
      .union([
        z.literal(''),
        z
          .string()
          .max(80000)
          .regex(/^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/),
      ])
      .default(''),
    palette: z
      .array(z.enum(['default', 'teal', 'violet', 'rose', 'amber']))
      .min(1)
      .max(5)
      .default(['default']),
  })
  .strict();
export type CompanyProfile = z.infer<typeof companyProfileSchema>;
