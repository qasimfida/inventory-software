import { Inject, Injectable } from '@nestjs/common';
import { revalidatedListingStatus } from '@inventory/contracts';
import type { StorefrontSettings, ListingStatus } from '@inventory/contracts';
import { PricingService } from '../catalog/pricing.service.js';
import { ENVIRONMENT } from '../config/environment.js';
import type { Environment } from '../config/environment.js';
import type { OrganizationContext } from '../organization/organization.scope.js';
import { audit } from '../organization/organization.scope.js';
import { managementSettings } from './storefront-management-records.js';
import { evaluateListing } from './storefront-evaluation.js';
import { listingEvent, storefrontRevision } from './storefront-events.js';
@Injectable()
export class StorefrontProjection {
  constructor(
    @Inject(PricingService) private pricing: PricingService,
    @Inject(ENVIRONMENT) private env: Environment,
  ) {}
  async refresh(
    ctx: OrganizationContext,
    config: StorefrontSettings,
    productIds?: string[],
    system = true,
    reason = 'readiness_revalidated',
  ) {
    const management = await managementSettings(
      ctx,
      config.storeId,
      this.env.storefrontMediaOrigins,
    );
    const rows = (
      await ctx.tx.query(
        "SELECT * FROM channel_listings WHERE business_id=$1 AND store_id=$2 AND state<>'delisted' AND ($3::uuid[] IS NULL OR product_id=ANY($3)) ORDER BY id",
        [ctx.business.id, config.storeId, productIds ?? null],
      )
    ).rows;
    let changed = false,
      failed = 0,
      repaired = 0;
    for (const row of rows) {
      const { result, projection } = await evaluateListing(
        ctx,
        config,
        management,
        row,
        this.pricing,
        this.env.storefrontMediaOrigins,
      );
      const state = revalidatedListingStatus(
        row.state as ListingStatus,
        result.ready,
        !!row.paused_at,
      );
      const issues = result.issues.filter((i) => i.severity === 'error').map((i) => i.message);
      const update = await ctx.tx.query(
        `UPDATE channel_listings SET state=$3,issues=$4,structured_issues=$5,rule_version=$6,projection=$7,last_validated_at=now(),
        version=version+CASE WHEN state IS DISTINCT FROM $3 OR structured_issues IS DISTINCT FROM $5::jsonb OR rule_version<>$6 OR projection IS DISTINCT FROM $7::jsonb THEN 1 ELSE 0 END,
        updated_at=CASE WHEN state IS DISTINCT FROM $3 OR structured_issues IS DISTINCT FROM $5::jsonb OR projection IS DISTINCT FROM $7::jsonb THEN now() ELSE updated_at END
        WHERE business_id=$1 AND id=$2 RETURNING version`,
        [
          ctx.business.id,
          row.id,
          state,
          JSON.stringify(issues),
          JSON.stringify(result.issues),
          result.ruleVersion,
          projection ? JSON.stringify(projection) : null,
        ],
      );
      changed ||= update.rows[0]?.version !== row.version;
      if (state !== row.state) {
        await listingEvent(
          ctx,
          config.storeId,
          row.id,
          row.state,
          state,
          result.ready ? 'readiness_repaired' : 'readiness_failed',
          system,
        );
        if (state === 'needs_changes') failed++;
        if (row.state === 'needs_changes' && result.ready) repaired++;
      }
    }
    if (failed || repaired)
      await audit(ctx, config.storeId, 'storefront.readiness_batch', null, {
        storeId: config.storeId,
        reasonCode: reason,
        quantity: failed,
        amount: repaired,
        automated: system,
      });
    if (changed) await storefrontRevision(ctx, config.storeId);
    await ctx.tx.query(
      'DELETE FROM storefront_revalidation WHERE business_id=$1 AND store_id=$2 AND ($3::uuid[] IS NULL OR product_id=ANY($3))',
      [ctx.business.id, config.storeId, productIds ?? null],
    );
    await ctx.tx.query(
      "UPDATE storefront_settings SET dirty=false,next_check=CASE WHEN EXISTS(SELECT 1 FROM storefront_revalidation q WHERE q.business_id=$1 AND q.store_id=$2) THEN now()+interval '1 second' ELSE LEAST(next_full_check,now()+interval '30 seconds') END,next_full_check=CASE WHEN $3 THEN now()+interval '30 seconds' ELSE next_full_check END WHERE business_id=$1 AND store_id=$2",
      [ctx.business.id, config.storeId, productIds === undefined],
    );
  }
}
