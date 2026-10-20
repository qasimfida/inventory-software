import { hasPermission } from '@inventory/contracts';
import { ConflictException, Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { VariantInput, VariantEdit, UnitInput, Conversion } from '@inventory/contracts';
import {
  OrganizationScope,
  audit,
  checkVersionAndState,
} from '../organization/organization.scope.js';
import type { Actor, OrganizationContext } from '../organization/organization.scope.js';
import { getProduct, requireBusinessScope } from './catalog.repository.js';
import { getVariant, conversion } from './variant.repository.js';
@Injectable()
export class VariantService {
  constructor(@Inject(OrganizationScope) private readonly scope: OrganizationScope) {}
  unit(actor: Actor, b: string, input: UnitInput) {
    return this.scope.run(actor, b, 'products.write', async (ctx) => {
      requireBusinessScope(ctx);
      const id = randomUUID();
      await ctx.tx.query(
        'INSERT INTO catalog_units(id,business_id,name,code,dimension) VALUES($1,$2,$3,$4,$5)',
        [id, b, input.name, input.code, input.dimension],
      );
      await audit(ctx, id, 'unit.created', null, input);
      return { ...input, id };
    });
  }
  create(actor: Actor, b: string, productId: string, input: VariantInput) {
    return this.scope.run(actor, b, 'products.write', async (ctx) => {
      requireBusinessScope(ctx);
      const product = await getProduct(ctx, productId);
      if (product.state === 'archived') throw new ConflictException();
      const units = [
        input.baseUnitId,
        input.purchaseUnitId ?? input.baseUnitId,
        input.saleUnitId ?? input.baseUnitId,
        input.countUnitId ?? input.baseUnitId,
      ];
      // New variants start with one base unit. Add explicit conversion records before selecting other units.
      if (units.some((id) => id !== input.baseUnitId)) throw new ConflictException();
      if (input.cost !== null && !hasPermission(ctx.business, 'purchases.write'))
        throw new ConflictException();
      const id = randomUUID();
      await ctx.tx.query(
        `INSERT INTO catalog_variants(id,business_id,product_id,name,sku,attributes,base_unit_id,purchase_unit_id,sale_unit_id,count_unit_id,cost,cost_currency,state) VALUES($1,$2,$3,$4,$5,$6,$7,$7,$7,$7,$8,$9,$10)`,
        [
          id,
          b,
          productId,
          input.name,
          input.sku,
          JSON.stringify(input.attributes),
          input.baseUnitId,
          input.cost,
          input.costCurrency,
          input.state,
        ],
      );
      await this.codes(ctx, id, productId, input);
      const result = await getVariant(ctx, id);
      await audit(ctx, id, 'variant.created', null, result);
      return {
        ...result,
        cost: hasPermission(ctx.business, 'purchases.read') ? result.cost : null,
      };
    });
  }
  edit(actor: Actor, b: string, id: string, input: VariantEdit) {
    return this.scope.run(actor, b, 'products.write', async (ctx) => {
      requireBusinessScope(ctx);
      const before = await getVariant(ctx, id);
      checkVersionAndState(before, input.version);
      if (!hasPermission(ctx.business, 'purchases.write')) {
        input = {
          ...input,
          cost: before.cost,
          costCurrency: before.costCurrency as VariantEdit['costCurrency'],
        };
      }
      if (input.baseUnitId !== before.baseUnitId || (before.isDefault && input.sku !== before.sku))
        throw new ConflictException();
      for (const unitId of [input.purchaseUnitId, input.saleUnitId, input.countUnitId])
        if (unitId) await conversion(ctx, id, unitId);
      await ctx.tx.query(
        `UPDATE catalog_variants SET name=$1,sku=$2,attributes=$3,purchase_unit_id=$4,sale_unit_id=$5,count_unit_id=$6,cost=$7,cost_currency=$8,state=$9,version=version+1 WHERE business_id=$10 AND id=$11`,
        [
          input.name,
          input.sku,
          JSON.stringify(input.attributes),
          input.purchaseUnitId ?? before.baseUnitId,
          input.saleUnitId ?? before.baseUnitId,
          input.countUnitId ?? before.baseUnitId,
          input.cost,
          input.costCurrency,
          input.state,
          b,
          id,
        ],
      );
      if (!before.isDefault) await this.codes(ctx, id, before.productId, input);
      else if (
        JSON.stringify([...input.barcodes].sort()) !== JSON.stringify([...before.barcodes].sort())
      )
        throw new ConflictException();
      const result = await getVariant(ctx, id);
      await audit(ctx, id, 'variant.updated', before, result);
      return {
        ...result,
        cost: hasPermission(ctx.business, 'purchases.read') ? result.cost : null,
      };
    });
  }
  private async codes(
    ctx: OrganizationContext,
    id: string,
    productId: string,
    input: { sku: string; barcodes: string[] },
  ) {
    await ctx.tx.query('DELETE FROM catalog_identifiers WHERE business_id=$1 AND variant_id=$2', [
      ctx.business.id,
      id,
    ]);
    for (const code of [input.sku, ...input.barcodes])
      await ctx.tx.query(
        'INSERT INTO catalog_identifiers(business_id,product_id,variant_id,code,kind) VALUES($1,$2,$3,$4,$5)',
        [ctx.business.id, productId, id, code, code === input.sku ? 'sku' : 'barcode'],
      );
  }
  addConversion(actor: Actor, b: string, id: string, input: Conversion) {
    return this.scope.run(actor, b, 'products.write', async (ctx) => {
      requireBusinessScope(ctx);
      const variant = await getVariant(ctx, id);
      if (variant.state === 'archived' || variant.baseUnitId === input.unitId)
        throw new ConflictException();
      const units = await ctx.tx.query<{ dimension: string }>(
        'SELECT dimension FROM catalog_units WHERE business_id=$1 AND id=ANY($2::uuid[])',
        [b, [variant.baseUnitId, input.unitId]],
      );
      if (units.rowCount !== 2 || new Set(units.rows.map((u) => u.dimension)).size !== 1)
        throw new ConflictException();
      await ctx.tx.query(
        'INSERT INTO catalog_conversions(business_id,variant_id,unit_id,numerator,denominator) VALUES($1,$2,$3,$4,$5)',
        [b, id, input.unitId, input.numerator, input.denominator],
      );
      await audit(ctx, id, 'conversion.created', null, input);
      return { ok: true };
    });
  }
}
