import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { hasPermission, listingCountsSchema } from '@inventory/contracts';
import type { ListingQuery } from '@inventory/contracts';
import type { OrganizationContext } from '../organization/organization.scope.js';
import { managementListing, managementListingSelect } from './storefront-management-records.js';
export async function listingCounts(ctx: OrganizationContext, storeId: string) {
  const rows = (
    await ctx.tx.query(
      "SELECT state,count(*)::int AS count FROM channel_listings WHERE business_id=$1 AND store_id=$2 AND state<>'delisted' GROUP BY state",
      [ctx.business.id, storeId],
    )
  ).rows;
  return listingCountsSchema.parse({
    selected: 0,
    needs_changes: 0,
    ready: 0,
    active: 0,
    paused: 0,
    ...Object.fromEntries(rows.map((r) => [r.state, r.count])),
  });
}
export async function listingPage(ctx: OrganizationContext, storeId: string, q: ListingQuery) {
  if (q.issue === 'PRICE_BELOW_COST' && !hasPermission(ctx.business, 'purchases.read'))
    throw new ForbiddenException();
  let offset = 0;
  const scope = JSON.stringify([
    ctx.business.id,
    storeId,
    q.status,
    q.tab,
    q.attention,
    q.search,
    q.category,
    q.issue,
    q.sort,
    q.productIds,
  ]);
  if (q.cursor) {
    try {
      const v = JSON.parse(Buffer.from(q.cursor, 'base64url').toString()) as {
        scope: unknown;
        offset: unknown;
      };
      if (
        v.scope !== scope ||
        typeof v.offset !== 'number' ||
        !Number.isSafeInteger(v.offset) ||
        v.offset < 0 ||
        v.offset > 1000000
      )
        throw new Error();
      offset = v.offset;
    } catch {
      throw new BadRequestException('Invalid listing cursor');
    }
  }
  // Cursor is a bounded position, never an authorization token; every query is scoped again.
  const rows = (
    await ctx.tx.query(
      `${managementListingSelect} WHERE l.business_id=$1 AND l.store_id=$2 AND l.state<>'delisted'
    AND ($3::text IS NULL OR l.state=$3 OR ($3='active-tab' AND l.state IN ('active','paused'))) AND ($4='' OR p.name ILIKE '%'||$4||'%' OR l.online_overrides->>'title' ILIKE '%'||$4||'%')
    AND ($5::uuid IS NULL OR p.category_id=$5) AND ($6::text IS NULL OR EXISTS(SELECT 1 FROM jsonb_array_elements(l.structured_issues) i WHERE i->>'code'=$6))
    AND ($9::text IS NULL OR ($9='sold-out' AND l.state='active' AND l.projection->>'availability'='sold_out') OR ($9='warnings' AND EXISTS(SELECT 1 FROM jsonb_array_elements(l.structured_issues) i WHERE i->>'severity'='warning' AND ($10::boolean OR i->>'code'<>'PRICE_BELOW_COST'))))
    AND ($11::uuid[] IS NULL OR l.product_id=ANY($11::uuid[]))
    ORDER BY ${q.sort === 'updated' ? 'l.updated_at DESC' : 'title ASC'},l.id LIMIT $7 OFFSET $8`,
      [
        ctx.business.id,
        storeId,
        q.tab === 'active'
          ? 'active-tab'
          : q.tab === 'changes-required'
            ? 'needs_changes'
            : q.tab === 'ready'
              ? 'ready'
              : (q.status ?? null),
        q.search,
        q.category ?? null,
        q.issue ?? null,
        q.limit + 1,
        offset,
        q.attention ?? null,
        hasPermission(ctx.business, 'purchases.read'),
        q.productIds?.split(',') ?? null,
      ],
    )
  ).rows;
  return {
    items: rows
      .slice(0, q.limit)
      .map((r) => managementListing(r, hasPermission(ctx.business, 'purchases.read'))),
    counts: await listingCounts(ctx, storeId),
    nextCursor:
      rows.length > q.limit
        ? Buffer.from(JSON.stringify({ scope, offset: offset + q.limit })).toString('base64url')
        : null,
    asOf: new Date().toISOString(),
  };
}
