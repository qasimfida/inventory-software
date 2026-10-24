import { z } from 'zod';
/** Bounded comma-separated query transport; every ID is authorized again by the server. */
export const locationIdsSchema = z
  .preprocess(
    (value) => (typeof value === 'string' ? value.split(',').filter(Boolean) : value),
    z
      .array(z.uuid())
      .max(100)
      .transform((ids) => [...new Set(ids)]),
  )
  .optional();
