import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { Category, CategoryInput, CategoryEdit } from '@inventory/contracts';
import {
  OrganizationScope,
  audit,
  checkVersionAndState,
} from '../organization/organization.scope.js';
import type { Actor, OrganizationContext } from '../organization/organization.scope.js';
import { requireBusinessScope, validateCategory } from './catalog.repository.js';
const projection = 'id,name,parent_id AS "parentId",state,version';
@Injectable()
export class CategoryService {
  constructor(@Inject(OrganizationScope) private readonly scope: OrganizationScope) {}
  list(actor: Actor, businessId: string) {
    return this.scope.run(actor, businessId, 'products.read', async (ctx) => ({
      items: (
        await ctx.tx.query<Category>(
          `SELECT ${projection} FROM catalog_categories WHERE business_id=$1 ORDER BY name,id`,
          [businessId],
        )
      ).rows,
    }));
  }
  private async get(ctx: OrganizationContext, id: string) {
    const row = (
      await ctx.tx.query<Category>(
        `SELECT ${projection} FROM catalog_categories WHERE business_id=$1 AND id=$2`,
        [ctx.business.id, id],
      )
    ).rows[0];
    if (!row) throw new NotFoundException();
    return row;
  }
  create(actor: Actor, businessId: string, input: CategoryInput) {
    return this.scope.run(actor, businessId, 'products.write', async (ctx) => {
      requireBusinessScope(ctx);
      await validateCategory(ctx, input.parentId);
      const id = randomUUID();
      await ctx.tx.query(
        'INSERT INTO catalog_categories(id,business_id,name,parent_id,state) VALUES($1,$2,$3,$4,$5)',
        [id, businessId, input.name, input.parentId, input.state],
      );
      const result = await this.get(ctx, id);
      await audit(ctx, id, 'category.created', null, result);
      return result;
    });
  }
  edit(actor: Actor, businessId: string, id: string, input: CategoryEdit) {
    return this.scope.run(actor, businessId, 'products.write', async (ctx) => {
      requireBusinessScope(ctx);
      const before = await this.get(ctx, id);
      checkVersionAndState(before, input.version);
      await validateCategory(ctx, input.parentId);
      if (input.parentId) {
        const cycle = await ctx.tx.query(
          `WITH RECURSIVE ancestors AS (SELECT id,parent_id FROM catalog_categories WHERE business_id=$1 AND id=$2 UNION ALL SELECT c.id,c.parent_id FROM catalog_categories c JOIN ancestors a ON c.id=a.parent_id WHERE c.business_id=$1) SELECT id FROM ancestors WHERE id=$3`,
          [businessId, input.parentId, id],
        );
        if (cycle.rowCount) throw new ConflictException();
      }
      if (input.state !== 'active') {
        const children = await ctx.tx.query(
          "SELECT id FROM catalog_categories WHERE business_id=$1 AND parent_id=$2 AND state='active' UNION ALL SELECT id FROM catalog_products WHERE business_id=$1 AND category_id=$2 AND state='active'",
          [businessId, id],
        );
        if (children.rowCount) throw new ConflictException();
      }
      await ctx.tx.query(
        'UPDATE catalog_categories SET name=$1,parent_id=$2,state=$3,version=version+1 WHERE business_id=$4 AND id=$5',
        [input.name, input.parentId, input.state, businessId, id],
      );
      const result = await this.get(ctx, id);
      await audit(ctx, id, 'category.updated', before, result);
      return result;
    });
  }
}
