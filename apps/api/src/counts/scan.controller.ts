import {
  Controller,
  Get,
  Inject,
  Param,
  ParseUUIDPipe,
  Query,
  Req,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { z } from 'zod';
import { hasPermission } from '@inventory/contracts';
import { OrganizationScope } from '../organization/organization.scope.js';
import { LedgerCore } from '../inventory/ledger-core.js';
import { requestActor } from '../http/actor.js';
import type { AuthRequest } from '../auth/auth.http.js';
import { SchemaPipe } from '../http/schema.pipe.js';
const scanQuery = z
  .object({
    warehouseId: z.uuid(),
    code: z.string().trim().min(1).max(120),
    kind: z.enum(['product', 'location']),
  })
  .strict();
@Controller('businesses/:businessId/scans')
export class ScanController {
  constructor(
    @Inject(OrganizationScope) private scope: OrganizationScope,
    @Inject(LedgerCore) private ledger: LedgerCore,
  ) {}
  @Get() resolve(
    @Req() r: AuthRequest,
    @Param('businessId', new ParseUUIDPipe()) b: string,
    @Query(new SchemaPipe(scanQuery)) q: z.infer<typeof scanQuery>,
  ) {
    return this.scope.run(requestActor(r), b, 'stock.read', async (ctx) => {
      await this.ledger.warehouse(ctx, q.warehouseId);
      if (q.kind === 'location') {
        const row = (
          await ctx.tx.query<{ id: string; name: string; code: string }>(
            "SELECT id,name,code FROM storage_locations WHERE business_id=$1 AND warehouse_id=$2 AND state='active' AND (code=$3 OR id::text=$3)",
            [b, q.warehouseId, q.code],
          )
        ).rows[0];
        if (!row) throw new NotFoundException();
        return { kind: 'location', ...row };
      }
      if (!hasPermission(ctx.business, 'products.read')) throw new ForbiddenException();
      const rows = (
        await ctx.tx.query<{ id: string; name: string; sku: string }>(
          "SELECT DISTINCT v.id,p.name,v.sku FROM catalog_variants v JOIN catalog_products p ON p.business_id=v.business_id AND p.id=v.product_id LEFT JOIN catalog_identifiers i ON i.business_id=v.business_id AND i.variant_id=v.id WHERE v.business_id=$1 AND v.state='active' AND p.state='active' AND (v.id::text=$2 OR v.sku=$2 OR i.code=$2) LIMIT 2",
          [b, q.code],
        )
      ).rows;
      if (rows.length !== 1) throw new NotFoundException();
      const row = rows[0]!;
      const units = (
        await ctx.tx.query(
          'SELECT u.id,u.code FROM catalog_units u JOIN catalog_variants v ON v.business_id=u.business_id LEFT JOIN catalog_conversions c ON c.business_id=v.business_id AND c.variant_id=v.id AND c.unit_id=u.id WHERE v.business_id=$1 AND v.id=$2 AND (u.id=v.base_unit_id OR c.unit_id IS NOT NULL) ORDER BY u.code',
          [b, row.id],
        )
      ).rows;
      return { kind: 'product', ...row, units };
    });
  }
}
