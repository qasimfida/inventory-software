import { ensureDefaultVariant } from './variant.repository.js';
import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { CatalogQuery, ProductInput, ProductEdit } from '@inventory/contracts';
import {
  OrganizationScope,
  audit,
  checkVersionAndState,
} from '../organization/organization.scope.js';
import type { Actor, OrganizationContext } from '../organization/organization.scope.js';
import {
  getProduct,
  productPage,
  requireBusinessScope,
  validateCategory,
  writeIdentifiers,
} from './catalog.repository.js';
@Injectable()
export class ProductService {
  constructor(@Inject(OrganizationScope) private readonly scope: OrganizationScope) {}
  list(actor: Actor, businessId: string, query: CatalogQuery) {
    return this.scope.run(actor, businessId, 'products.read', (ctx) => productPage(ctx, query));
  }
  get(actor: Actor, businessId: string, id: string) {
    return this.scope.run(actor, businessId, 'products.read', (ctx) => getProduct(ctx, id));
  }
  create(actor: Actor, businessId: string, input: ProductInput) {
    return this.scope.run(actor, businessId, 'products.write', (ctx) =>
      this.createInTransaction(ctx, input),
    );
  }
  async createInTransaction(ctx: OrganizationContext, input: ProductInput) {
    const businessId = ctx.business.id;
    requireBusinessScope(ctx);
    await validateCategory(ctx, input.categoryId);
    const id = randomUUID();
    await ctx.tx.query(
      `INSERT INTO catalog_products(id,business_id,name,sku,description,images,category_id,state,type,track_inventory) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [
        id,
        businessId,
        input.name,
        input.sku,
        input.description,
        JSON.stringify(input.images),
        input.categoryId,
        input.state,
        input.type,
        input.trackInventory,
      ],
    );
    await writeIdentifiers(ctx, id, input);
    await ensureDefaultVariant(ctx, id);
    const result = await getProduct(ctx, id);
    await audit(ctx, id, 'product.created', null, result);
    return result;
  }

  edit(actor: Actor, businessId: string, id: string, input: ProductEdit) {
    return this.scope.run(actor, businessId, 'products.write', async (ctx) => {
      requireBusinessScope(ctx);
      const before = await getProduct(ctx, id);
      checkVersionAndState(before, input.version);
      await validateCategory(ctx, input.categoryId);
      await ctx.tx.query(
        `UPDATE catalog_products SET name=$1,sku=$2,description=$3,images=$4,category_id=$5,state=$6,type=$7,track_inventory=$8,version=version+1 WHERE business_id=$9 AND id=$10`,
        [
          input.name,
          input.sku,
          input.description,
          JSON.stringify(input.images),
          input.categoryId,
          input.state,
          input.type,
          input.trackInventory,
          businessId,
          id,
        ],
      );
      await writeIdentifiers(ctx, id, input);
      await ctx.tx.query(
        'UPDATE catalog_variants SET name=$1,sku=$2,version=version+1 WHERE business_id=$3 AND id=$4 AND is_default',
        [input.name, input.sku, businessId, id],
      );
      await ctx.tx.query(
        'UPDATE catalog_identifiers SET variant_id=$3 WHERE business_id=$1 AND product_id=$2 AND variant_id IS NULL',
        [businessId, id, id],
      );
      const result = await getProduct(ctx, id);
      await audit(ctx, id, 'product.updated', before, result);
      return result;
    });
  }
}
