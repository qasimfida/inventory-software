import { Body, Controller, Inject, Param, ParseUUIDPipe, Post, Req } from '@nestjs/common';
import { importInputSchema, createProductSchema } from '@inventory/contracts';
import type { ImportInput } from '@inventory/contracts';
import { randomUUID } from 'node:crypto';
import { decimal } from '@inventory/domain';
import type { AuthRequest } from '../auth/auth.http.js';
import { requestActor } from '../http/actor.js';
import { SchemaPipe } from '../http/schema.pipe.js';
import { OrganizationScope, audit } from '../organization/organization.scope.js';
import { requirePermission } from '../organization/access.js';
import { ProductService } from '../catalog/product.service.js';
import { requireBusinessScope } from '../catalog/catalog.repository.js';
import { LedgerCore } from '../inventory/ledger-core.js';
import { idempotent } from '../database/idempotency.js';
@Controller('businesses/:businessId/imports')
export class ImportsController {
  constructor(
    @Inject(OrganizationScope) private readonly scope: OrganizationScope,
    @Inject(ProductService) private readonly products: ProductService,
    @Inject(LedgerCore) private readonly ledger: LedgerCore,
  ) {}
  @Post('products') create(
    @Req() r: AuthRequest,
    @Param('businessId', new ParseUUIDPipe()) b: string,
    @Body(new SchemaPipe(importInputSchema)) input: ImportInput,
  ) {
    return this.scope.run(requestActor(r), b, 'products.write', (ctx) => {
      requireBusinessScope(ctx);
      if (input.rows.some((row) => decimal(row.quantity) > 0n))
        requirePermission(ctx.business, 'stock.write');
      return idempotent(ctx, 'products.import', input.idempotencyKey, input, async () => {
        if (input.warehouseId) await this.ledger.warehouse(ctx, input.warehouseId);
        const products: string[] = [];
        for (const row of input.rows) {
          const product = await this.products.createInTransaction(
            ctx,
            createProductSchema.parse({
              name: row.name,
              sku: row.sku,
              description: row.description,
            }),
          );
          const priceId = randomUUID();
          await ctx.tx.query(
            `INSERT INTO price_entries(id,business_id,variant_id,unit_price,currency,tax_basis_points,tax_inclusive,starts_at) VALUES($1,$2,$3,$4,$5,0,false,now())`,
            [priceId, b, product.id, row.price, row.currency],
          );
          await audit(ctx, priceId, 'price.created', null, {
            variantId: product.id,
            currency: row.currency,
            unitPrice: row.price,
          });
          if (decimal(row.quantity) > 0n && input.warehouseId)
            await this.ledger.apply(ctx, {
              variantId: product.id,
              warehouseId: input.warehouseId,
              locationId: null,
              quantityDelta: row.quantity,
              type: 'opening',
              sourceKind: 'manual',
              sourceId: product.id,
              commandId: input.idempotencyKey,
              reason: 'Opening stock from reviewed product import',
            });
          products.push(product.id);
        }
        await audit(ctx, input.idempotencyKey, 'products.imported', null, {
          count: products.length,
          warehouseId: input.warehouseId,
        });
        return { created: products.length, products };
      });
    });
  }
}
