import { z } from 'zod';
export const setupChecklistSchema = z
  .object({
    dismissed: z.boolean().default(false),
    profile: z.boolean(),
    currency: z.boolean(),
    tax: z.boolean(),
    locations: z.boolean(),
    product: z.boolean(),
    stock: z.boolean(),
  })
  .strict();
export type SetupChecklist = z.infer<typeof setupChecklistSchema>;
