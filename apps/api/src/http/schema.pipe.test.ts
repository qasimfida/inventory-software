import { expect, it } from 'vitest';
import { z } from 'zod';
import { SchemaPipe } from './schema.pipe.js';
import { BadRequestException } from '@nestjs/common';
it('returns safe paths/codes without echoing rejected credentials', () => {
  try {
    new SchemaPipe(z.object({ secret: z.string().max(1) }).strict()).transform({
      secret: 'private-value',
    });
    throw new Error('expected failure');
  } catch (error) {
    expect(error).toBeInstanceOf(BadRequestException);
    expect(JSON.stringify((error as BadRequestException).getResponse())).not.toContain(
      'private-value',
    );
  }
});
