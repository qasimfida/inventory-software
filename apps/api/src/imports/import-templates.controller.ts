import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  ConflictException,
} from '@nestjs/common';
import { z } from 'zod';
import { randomUUID } from 'node:crypto';
import { importTemplateInputSchema, importTemplateEditSchema } from '@inventory/contracts';
import type { ImportTemplateInput } from '@inventory/contracts';
import type { AuthRequest } from '../auth/auth.http.js';
import { requestActor } from '../http/actor.js';
import { SchemaPipe } from '../http/schema.pipe.js';
import { OrganizationScope, audit } from '../organization/organization.scope.js';
import { requireBusinessScope } from '../catalog/catalog.repository.js';
const versionQuery = z.object({ version: z.coerce.number().int().positive() }).strict();
@Controller('businesses/:businessId/imports/templates')
export class ImportTemplatesController {
  constructor(@Inject(OrganizationScope) private readonly scope: OrganizationScope) {}
  @Get() list(@Req() r: AuthRequest, @Param('businessId', new ParseUUIDPipe()) b: string) {
    return this.scope.run(requestActor(r), b, 'products.write', async (ctx) => {
      requireBusinessScope(ctx);
      return {
        items: (
          await ctx.tx.query(
            'SELECT id,name,mapping,version FROM product_import_templates WHERE business_id=$1 ORDER BY lower(name),id LIMIT 50',
            [b],
          )
        ).rows,
      };
    });
  }
  @Post() create(
    @Req() r: AuthRequest,
    @Param('businessId', new ParseUUIDPipe()) b: string,
    @Body(new SchemaPipe(importTemplateInputSchema)) input: ImportTemplateInput,
  ) {
    return this.scope.run(requestActor(r), b, 'products.write', async (ctx) => {
      requireBusinessScope(ctx);
      const count = await ctx.tx.query<{ count: number }>(
        'SELECT count(*)::int AS count FROM product_import_templates WHERE business_id=$1',
        [b],
      );
      if (count.rows[0]!.count >= 50)
        throw new ConflictException('Maximum 50 templates per business.');
      const id = randomUUID();
      const result = (
        await ctx.tx.query(
          'INSERT INTO product_import_templates(id,business_id,name,mapping) VALUES($1,$2,$3,$4) RETURNING id,name,mapping,version',
          [id, b, input.name, JSON.stringify(input.mapping)],
        )
      ).rows[0];
      await audit(ctx, id, 'import_template.created', null, result);
      return result;
    });
  }
  @Patch(':id') edit(
    @Req() r: AuthRequest,
    @Param('businessId', new ParseUUIDPipe()) b: string,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body(new SchemaPipe(importTemplateEditSchema)) input: z.infer<typeof importTemplateEditSchema>,
  ) {
    return this.scope.run(requestActor(r), b, 'products.write', async (ctx) => {
      requireBusinessScope(ctx);
      const result = await ctx.tx.query(
        'UPDATE product_import_templates SET name=$3,mapping=$4,version=version+1,updated_at=now() WHERE business_id=$1 AND id=$2 AND version=$5 RETURNING id,name,mapping,version',
        [b, id, input.name, JSON.stringify(input.mapping), input.version],
      );
      if (!result.rowCount) throw new ConflictException();
      await audit(ctx, id, 'import_template.updated', null, result.rows[0]);
      return result.rows[0];
    });
  }
  @Delete(':id') remove(
    @Req() r: AuthRequest,
    @Param('businessId', new ParseUUIDPipe()) b: string,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Query(new SchemaPipe(versionQuery)) query: z.infer<typeof versionQuery>,
  ) {
    return this.scope.run(requestActor(r), b, 'products.write', async (ctx) => {
      requireBusinessScope(ctx);
      const result = await ctx.tx.query(
        'DELETE FROM product_import_templates WHERE business_id=$1 AND id=$2 AND version=$3 RETURNING name,mapping,version',
        [b, id, query.version],
      );
      if (!result.rowCount) throw new ConflictException();
      await audit(ctx, id, 'import_template.deleted', result.rows[0], null);
      return { ok: true };
    });
  }
}
