import { Controller, Get, Inject, Injectable, Module, Req, Header } from '@nestjs/common';
import { exchangeSnapshotSchema, type ExchangeResponse } from '@inventory/contracts';
import { DatabaseModule } from '../database/database.module.js';
import { DatabaseService } from '../database/database.service.js';
import { ConfigurationModule } from '../config/configuration.module.js';
import { ENVIRONMENT, type Environment } from '../config/environment.js';
import { requestActor } from '../http/actor.js';
import type { AuthRequest } from '../auth/auth.http.js';
import { fetchRates } from './provider.js';
@Injectable()
export class ExchangeRatesService {
  constructor(
    @Inject(DatabaseService) private readonly db: DatabaseService,
    @Inject(ENVIRONMENT) private readonly env: Environment,
  ) {}
  async get(): Promise<ExchangeResponse> {
    if (!this.env.OPEN_EXCHANGE_RATES_APP_ID) return { snapshot: null, reason: 'not-configured' };
    return this.db.transaction(async (tx) => {
      const result = await tx.query<{ snapshot: unknown; due: boolean }>(
        "SELECT snapshot,next_attempt_at<=now() AS due FROM exchange_rate_cache WHERE id='open-exchange-rates' FOR UPDATE",
      );
      const row = result.rows[0];
      if (!row) return { snapshot: null, reason: 'unavailable' };
      let snapshot = exchangeSnapshotSchema.safeParse(row.snapshot).data ?? null;
      if (row.due) {
        // One attempt/hour, including failures. Cross-replica lock avoids provider-quota storms.
        await tx.query(
          "UPDATE exchange_rate_cache SET next_attempt_at=now()+interval '1 hour' WHERE id='open-exchange-rates'",
        );
        try {
          snapshot = await fetchRates(this.env.OPEN_EXCHANGE_RATES_APP_ID);
          await tx.query(
            "UPDATE exchange_rate_cache SET snapshot=$1 WHERE id='open-exchange-rates'",
            [JSON.stringify(snapshot)],
          );
        } catch {
          /* Never log the provider URL/App ID or response body. Use a still-valid snapshot. */
        }
      }
      return {
        snapshot,
        reason: !snapshot
          ? 'unavailable'
          : Date.parse(snapshot.expiresAt) <= Date.now()
            ? 'stale'
            : null,
      };
    });
  }
}
@Controller('auth/exchange-rates')
class ExchangeRatesController {
  constructor(@Inject(ExchangeRatesService) private readonly service: ExchangeRatesService) {}
  @Get() @Header('Cache-Control', 'no-store') get(@Req() request: AuthRequest) {
    requestActor(request); // Existing global session guard applies; no guest financial API.
    return this.service.get();
  }
}
@Module({
  imports: [DatabaseModule, ConfigurationModule],
  controllers: [ExchangeRatesController],
  providers: [ExchangeRatesService],
})
export class ExchangeRatesModule {}
