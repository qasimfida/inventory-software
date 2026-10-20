import { BadRequestException } from '@nestjs/common';
import type { PipeTransform } from '@nestjs/common';
import type { z } from 'zod';
export class SchemaPipe implements PipeTransform {
  constructor(private readonly schema: z.ZodType) {}
  transform(value: unknown) {
    const parsed = this.schema.safeParse(value);
    if (!parsed.success)
      throw new BadRequestException({
        fields: parsed.error.issues
          .slice(0, 20)
          .map((issue) => ({ path: issue.path.map(String).join('.'), code: issue.code })),
      });
    return parsed.data;
  }
}
