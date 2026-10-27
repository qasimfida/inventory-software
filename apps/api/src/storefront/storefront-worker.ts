import { Inject, Injectable, Logger } from '@nestjs/common';
import type { OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { DatabaseService } from '../database/database.service.js';
import { StorefrontPublic } from './storefront-public.js';
@Injectable()
export class StorefrontWorker implements OnModuleInit, OnModuleDestroy {
  private timer: ReturnType<typeof setInterval> | undefined;
  private running: Promise<void> | undefined;
  constructor(
    @Inject(DatabaseService) private db: DatabaseService,
    @Inject(StorefrontPublic) private publication: StorefrontPublic,
  ) {}
  onModuleInit() {
    this.timer = setInterval(() => {
      void this.flush().catch(() =>
        new Logger('StorefrontWorker').error({ event: 'storefront.revalidation_failed' }),
      );
    }, 2000);
    this.timer.unref();
  }
  async onModuleDestroy() {
    clearInterval(this.timer);
    await this.running?.catch(() => undefined);
  }
  flush() {
    this.running ??= this.process().finally(() => {
      this.running = undefined;
    });
    return this.running;
  }
  private async process() {
    const rows = (
      await this.db.query<{ business_id: string; store_id: string }>(
        "SELECT s.business_id,s.store_id FROM storefront_settings s JOIN businesses b ON b.id=s.business_id WHERE b.state='active' AND s.next_check<=now() ORDER BY s.next_check,s.business_id LIMIT 20",
      )
    ).rows;
    for (const row of rows)
      try {
        await this.publication.refresh(row.business_id, undefined, row.store_id);
      } catch {
        await this.db.query(
          "UPDATE storefront_settings SET next_check=now()+interval '1 minute' WHERE business_id=$1 AND store_id=$2",
          [row.business_id, row.store_id],
        );
        new Logger('StorefrontWorker').error({
          event: 'storefront.revalidation_item_failed',
          businessId: row.business_id,
        });
      }
  }
}
