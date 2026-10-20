import { ConflictException, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { OrganizationContext } from '../organization/organization.scope.js';
import { getProduct } from './catalog.repository.js';
export const variantProjection = `v.id,v.product_id AS "productId",v.name,v.sku,v.attributes,v.base_unit_id AS "baseUnitId",v.purchase_unit_id AS "purchaseUnitId",v.sale_unit_id AS "saleUnitId",v.count_unit_id AS "countUnitId",v.cost::text,v.cost_currency AS "costCurrency",v.state,v.version,v.is_default AS "isDefault",
 ARRAY(SELECT code FROM catalog_identifiers c WHERE c.business_id=v.business_id AND c.variant_id=v.id AND c.kind='barcode' ORDER BY code) AS barcodes`;
export async function getVariant(ctx: OrganizationContext, id: string) {
  const row = (
    await ctx.tx.query<{
      id: string;
      productId: string;
      name: string;
      sku: string;
      attributes: Record<string, string>;
      baseUnitId: string;
      purchaseUnitId: string;
      saleUnitId: string;
      countUnitId: string;
      cost: string | null;
      costCurrency: string;
      state: string;
      version: number;
      isDefault: boolean;
      barcodes: string[];
    }>(`SELECT ${variantProjection} FROM catalog_variants v WHERE v.business_id=$1 AND v.id=$2`, [
      ctx.business.id,
      id,
    ])
  ).rows[0];
  if (!row) throw new NotFoundException();
  return row;
}
export async function activeVariant(ctx: OrganizationContext, id: string) {
  const v = await getVariant(ctx, id);
  const p = await getProduct(ctx, v.productId);
  if (v.state !== 'active' || p.state !== 'active') throw new ConflictException();
  return { variant: v, product: p };
}
export async function ensureDefaultVariant(ctx: OrganizationContext, productId: string) {
  let unit = (
    await ctx.tx.query<{ id: string; dimension: string }>(
      "SELECT id,dimension FROM catalog_units WHERE business_id=$1 AND code='EACH'",
      [ctx.business.id],
    )
  ).rows[0];
  if (!unit) {
    unit = { id: randomUUID(), dimension: 'count' };
    await ctx.tx.query(
      "INSERT INTO catalog_units(id,business_id,name,code,dimension) VALUES($1,$2,'Each','EACH','count')",
      [unit.id, ctx.business.id],
    );
  }
  if (unit.dimension !== 'count') throw new ConflictException();
  await ctx.tx.query(
    `INSERT INTO catalog_variants(id,business_id,product_id,name,sku,base_unit_id,purchase_unit_id,sale_unit_id,count_unit_id,state,is_default)
 SELECT id,business_id,id,name,sku,$3,$3,$3,$3,state,true FROM catalog_products WHERE business_id=$1 AND id=$2`,
    [ctx.business.id, productId, unit.id],
  );
  await ctx.tx.query(
    'UPDATE catalog_identifiers SET variant_id=$3 WHERE business_id=$1 AND product_id=$2 AND variant_id IS NULL',
    [ctx.business.id, productId, productId],
  );
}
export async function conversion(ctx: OrganizationContext, variantId: string, unitId: string) {
  const variant = await getVariant(ctx, variantId);
  if (unitId === variant.baseUnitId) return { numerator: '1', denominator: '1' };
  const row = (
    await ctx.tx.query<{ numerator: string; denominator: string }>(
      'SELECT numerator::text,denominator::text FROM catalog_conversions WHERE business_id=$1 AND variant_id=$2 AND unit_id=$3',
      [ctx.business.id, variantId, unitId],
    )
  ).rows[0];
  if (!row) throw new ConflictException();
  return row;
}
