import { z } from 'zod';
import { productSchema } from './catalog.js';
export const PRODUCT_IMAGE_MAX_BYTES = 512 * 1024;
export const productImageUploadSchema = z
  .object({
    mime: z.enum(['image/png', 'image/jpeg', 'image/webp']),
    base64: z
      .string()
      .min(4)
      .max(Math.ceil(PRODUCT_IMAGE_MAX_BYTES / 3) * 4)
      .regex(/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/),
  })
  .strict();
export const productImageUploadResultSchema = z
  .object({ url: productSchema.shape.images.unwrap().element })
  .strict();
export type ProductImageUpload = z.infer<typeof productImageUploadSchema>;
