import { z } from 'zod';
export const assistantInputSchema = z
  .object({ question: z.string().trim().min(1).max(2000) })
  .strict();
export const assistantOutputSchema = z
  .object({ explanation: z.string().trim().min(1).max(1200) })
  .strict();
export const integrationStatusSchema = z
  .object({
    services: z
      .array(
        z.object({
          id: z.enum(['payments', 'notifications', 'ai']),
          state: z.enum(['local', 'unconfigured', 'enabled']),
          detail: z.string(),
        }),
      )
      .max(3),
    navigation: z.array(z.string()).max(30),
  })
  .strict();
