import { ForbiddenException, NotFoundException, ConflictException } from '@nestjs/common';
import type { CatalogQuery, Product, ProductInput } from '@inventory/contracts';
import type { OrganizationContext } from '../organization/organization.scope.js';
export function requireBusinessScope(ctx: OrganizationContext) {
  if (ctx.business.scope?.storeId) throw new ForbiddenException();
}
const projection = `p.id,p.name,p.sku,p.description,p.images,p.category_id AS "categoryId",p.state,p.type,p.track_inventory AS "trackInventory",p.version,p.created_at AS "createdAt",
 ARRAY(SELECT code FROM catalog_identifiers c WHERE c.business_id=p.business_id AND c.product_id=p.id AND c.kind='barcode' AND (c.variant_id IS NULL OR c.variant_id=p.id) ORDER BY code) AS barcodes,
 ARRAY(SELECT code FROM catalog_identifiers c WHERE c.business_id=p.business_id AND c.product_id=p.id AND c.kind='alternate' AND (c.variant_id IS NULL OR c.variant_id=p.id) ORDER BY code) AS "alternativeCodes"`;
function wire(row: Product & { createdAt: Date | string }): Product {
  return { ...row, createdAt: new Date(row.createdAt).toISOString() };
}
export async function getProduct(ctx: OrganizationContext, id: string) {
  const row = (
    await ctx.tx.query<Product & { createdAt: Date }>(
      `SELECT ${projection} FROM catalog_products p WHERE p.business_id=$1 AND p.id=$2`,
      [ctx.business.id, id],
    )
  ).rows[0];
  if (!row) throw new NotFoundException();
  return wire(row);
}
export async function productPage(ctx: OrganizationContext, q: CatalogQuery) {
  const args: unknown[] = [
    ctx.business.id,
    `%${q.search.replace(/[\\%_]/g, '\\$&')}%`,
    q.state ?? null,
    q.categoryId ?? null,
    q.type ?? null,
    q.code ?? null,
  ];
  const where = `p.business_id=$1 AND (p.name ILIKE $2 OR p.sku ILIKE $2) AND ($3::text IS NULL OR p.state=$3) AND ($4::uuid IS NULL OR p.category_id=$4) AND ($5::text IS NULL OR p.type=$5)
 AND ($6::text IS NULL OR EXISTS(SELECT 1 FROM catalog_identifiers c WHERE c.business_id=p.business_id AND c.product_id=p.id AND c.code=$6))`;
  const total = Number(
    (await ctx.tx.query(`SELECT count(*) FROM catalog_products p WHERE ${where}`, args)).rows[0]
      ?.count ?? 0,
  );
  const sort = q.sort === 'createdAt' ? 'p.created_at' : 'lower(p.name)',
    direction = q.direction === 'desc' ? 'DESC' : 'ASC';
  const rows = (
    await ctx.tx.query<Product & { createdAt: Date }>(
      `SELECT ${projection} FROM catalog_products p WHERE ${where} ORDER BY ${sort} ${direction},p.id ${direction} LIMIT $7 OFFSET $8`,
      [...args, q.limit, q.offset],
    )
  ).rows.map(wire);
  return {
    items: rows,
    total,
    limit: q.limit,
    offset: q.offset,
    hasMore: q.offset + rows.length < total,
  };
}
export async function validateCategory(ctx: OrganizationContext, id: string | null) {
  if (
    id &&
    !(
      await ctx.tx.query(
        "SELECT 1 FROM catalog_categories WHERE business_id=$1 AND id=$2 AND state='active'",
        [ctx.business.id, id],
      )
    ).rowCount
  )
    throw new ConflictException();
}
export async function writeIdentifiers(ctx: OrganizationContext, id: string, input: ProductInput) {
  await ctx.tx.query(
    'DELETE FROM catalog_identifiers WHERE business_id=$1 AND product_id=$2 AND (variant_id IS NULL OR variant_id=product_id)',
    [ctx.business.id, id],
  );
  for (const [kind, codes] of [
    ['sku', [input.sku]],
    ['barcode', input.barcodes],
    ['alternate', input.alternativeCodes],
  ] as const)
    for (const code of codes)
      await ctx.tx.query(
        'INSERT INTO catalog_identifiers(business_id,product_id,code,kind) VALUES($1,$2,$3,$4)',
        [ctx.business.id, id, code, kind],
      );
}
