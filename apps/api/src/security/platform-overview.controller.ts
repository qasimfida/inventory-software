import { Controller, Get, Inject, Query, Req } from '@nestjs/common';
import { platformOverviewQuerySchema, platformOverviewSchema } from '@inventory/contracts';
import type { z } from 'zod';
import type { AuthRequest } from '../auth/auth.http.js';
import { requestActor } from '../http/actor.js';
import { SchemaPipe } from '../http/schema.pipe.js';
import { DatabaseService } from '../database/database.service.js';
import { requirePlatformAdmin } from '../settings/settings-store.js';
@Controller('auth/security/platform/overview')
export class PlatformOverviewController {
  constructor(@Inject(DatabaseService) private readonly db: DatabaseService) {}
  @Get() load(
    @Req() request: AuthRequest,
    @Query(new SchemaPipe(platformOverviewQuerySchema))
    q: z.infer<typeof platformOverviewQuerySchema>,
  ) {
    const actor = requestActor(request);
    return this.db.transaction(async (tx) => {
      await requirePlatformAdmin(tx, actor.accountId);
      const totals = (
        await tx.query(`SELECT (SELECT count(*)::text FROM businesses) businesses,
        (SELECT count(*)::text FROM businesses WHERE state='active') "activeBusinesses",
        (SELECT count(*)::text FROM auth_accounts) accounts,(SELECT count(*)::text FROM stores) stores,
        (SELECT count(*)::text FROM warehouses) warehouses,(SELECT count(*)::text FROM terminals) terminals`)
      ).rows[0];
      const search = `%${q.search.replace(/[\\%_]/g, '\\$&')}%`;
      const businesses = (
        await tx.query(
          'SELECT id,name,state,created_at AS "createdAt" FROM businesses WHERE name ILIKE $1 ORDER BY created_at DESC,id DESC LIMIT 26 OFFSET $2',
          [search, q.offset],
        )
      ).rows;
      const total =
        (
          await tx.query('SELECT count(*)::text total FROM businesses WHERE name ILIKE $1', [
            search,
          ])
        ).rows[0]?.total ?? '0';
      const registrations = (
        await tx.query(`WITH dates AS (SELECT generate_series((now() AT TIME ZONE 'UTC')::date-29,(now() AT TIME ZONE 'UTC')::date,interval '1 day')::date d), daily AS
        (SELECT (created_at AT TIME ZONE 'UTC')::date d,count(*)::text count FROM businesses WHERE created_at >= ((now() AT TIME ZONE 'UTC')::date-29)::timestamp AT TIME ZONE 'UTC' GROUP BY 1)
        SELECT to_char(d,'YYYY-MM-DD') date,coalesce(count,'0') count FROM dates LEFT JOIN daily USING(d) ORDER BY d`)
      ).rows;
      return platformOverviewSchema.parse({
        asOf: new Date().toISOString(),
        totals,
        registrations,
        businesses: businesses
          .slice(0, 25)
          .map((b) => ({ ...b, createdAt: b.createdAt.toISOString() })),
        total,
        offset: q.offset,
        hasMore: businesses.length > 25,
      });
    });
  }
}
