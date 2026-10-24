import {
  Controller,
  Get,
  Inject,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Query,
  Req,
} from '@nestjs/common';
import {
  platformBusinessesQuerySchema,
  platformBusinessesSchema,
  platformBusinessDetailSchema,
} from '@inventory/contracts';
import type { z } from 'zod';
import type { AuthRequest } from '../auth/auth.http.js';
import { requestActor } from '../http/actor.js';
import { SchemaPipe } from '../http/schema.pipe.js';
import { DatabaseService } from '../database/database.service.js';
import { requirePlatformAdmin } from '../settings/settings-store.js';
const projection = `id,name,state,time_zone AS "timeZone",created_at AS "createdAt",
 (SELECT count(*)::text FROM stores s WHERE s.business_id=businesses.id) AS "storeCount",
 (SELECT count(*)::text FROM warehouses w WHERE w.business_id=businesses.id) AS "warehouseCount"`;
/** Read-only registration directory. Every read revalidates platform authority. */
@Controller('auth/security/platform/businesses')
export class PlatformBusinessesController {
  constructor(@Inject(DatabaseService) private readonly db: DatabaseService) {}
  @Get() list(
    @Req() request: AuthRequest,
    @Query(new SchemaPipe(platformBusinessesQuerySchema))
    q: z.infer<typeof platformBusinessesQuerySchema>,
  ) {
    return this.db.transaction(async (tx) => {
      await requirePlatformAdmin(tx, requestActor(request).accountId);
      const filter = `%${q.search.replace(/[\\%_]/g, '\\$&')}%`;
      const where = "name ILIKE $1 AND ($2='all' OR state::text=$2)";
      const rows = (
        await tx.query(
          `SELECT ${projection} FROM businesses WHERE ${where} ORDER BY created_at DESC,id DESC LIMIT 26 OFFSET $3`,
          [filter, q.state, q.offset],
        )
      ).rows;
      const total = (
        await tx.query(`SELECT count(*)::text total FROM businesses WHERE ${where}`, [
          filter,
          q.state,
        ])
      ).rows[0]!.total;
      return platformBusinessesSchema.parse({
        businesses: rows
          .slice(0, 25)
          .map((row) => ({ ...row, createdAt: row.createdAt.toISOString() })),
        total,
        offset: q.offset,
        hasMore: rows.length > 25,
      });
    });
  }
  @Get(':id') detail(
    @Req() request: AuthRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Query(new SchemaPipe(platformBusinessesQuerySchema.pick({ offset: true })))
    q: { offset: number },
  ) {
    return this.db.transaction(async (tx) => {
      await requirePlatformAdmin(tx, requestActor(request).accountId);
      const business = (await tx.query(`SELECT ${projection} FROM businesses WHERE id=$1`, [id]))
        .rows[0];
      if (!business) throw new NotFoundException();
      const rows = (
        await tx.query(
          `SELECT * FROM (
        SELECT id,name,code,state,version,'stores' AS kind,type,NULL::uuid AS "storeId",NULL::uuid AS "warehouseId" FROM stores WHERE business_id=$1
        UNION ALL SELECT id,name,code,state,version,'warehouses' AS kind,'warehouse' AS type,store_id AS "storeId",NULL::uuid AS "warehouseId" FROM warehouses WHERE business_id=$1
      ) locations ORDER BY kind,name,id LIMIT 26 OFFSET $2`,
          [id, q.offset],
        )
      ).rows;
      return platformBusinessDetailSchema.parse({
        business: { ...business, createdAt: business.createdAt.toISOString() },
        locations: rows.slice(0, 25),
        offset: q.offset,
        hasMore: rows.length > 25,
      });
    });
  }
}
