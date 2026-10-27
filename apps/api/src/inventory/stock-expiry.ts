import { Inject, Injectable, Logger } from '@nestjs/common';
import type { OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { DatabaseService } from '../database/database.service.js';
import { StockHoldsService } from './stock-holds.service.js';
@Injectable()
export class StockExpiry implements OnModuleInit, OnModuleDestroy {
  private timer: ReturnType<typeof setInterval> | undefined;
  private running: Promise<void> | undefined;
  constructor(
    @Inject(DatabaseService) private readonly db: DatabaseService,
    @Inject(StockHoldsService) private readonly holds: StockHoldsService,
  ) {}
  onModuleInit() {
    this.timer = setInterval(() => {
      void this.flush().catch(() =>
        new Logger('StockExpiry').error({ event: 'stock.expiry_failed' }),
      );
    }, 15000);
    this.timer.unref();
  }
  async onModuleDestroy() {
    clearInterval(this.timer);
    await this.running?.catch(() => undefined);
  }
  flush() {
    this.running ??= this.expire().finally(() => {
      this.running = undefined;
    });
    return this.running;
  }
  private async expire() {
    const due = (
      await this.db.query<{ id: string; business_id: string }>(
        "SELECT id,business_id FROM stock_hold_orders WHERE state='open' AND expires_at<=now() ORDER BY expires_at,id LIMIT 100",
      )
    ).rows;
    for (const candidate of due)
      await this.db
        .transaction(async (tx) => {
          // Match OrganizationScope's business-first lock order. Other workers skip, then retry next tick.
          if (
            !(
              await tx.query('SELECT id FROM businesses WHERE id=$1 FOR UPDATE SKIP LOCKED', [
                candidate.business_id,
              ])
            ).rowCount
          )
            return;
          const hold = (
            await tx.query<{ created_by: string; warehouse_id: string }>(
              "SELECT created_by,warehouse_id FROM stock_hold_orders WHERE business_id=$1 AND id=$2 AND state='open' AND expires_at<=now() FOR UPDATE",
              [candidate.business_id, candidate.id],
            )
          ).rows[0];
          if (!hold) return;
          // Narrow internal cleanup authority, not a user session or permission grant. Original holder
          // remains attributable; the expiry action explicitly records automated=true.
          await this.holds.close(
            {
              tx,
              business: {
                id: candidate.business_id,
                name: '',
                state: 'active',
                version: 1,
                role: 'custom',
                permissions: [],
                scope: { storeId: null, warehouseId: hold.warehouse_id },
              },
              actor: { accountId: hold.created_by, requestId: randomUUID() },
            },
            candidate.id,
            'expired',
            candidate.id,
            'Automatic expiry of order hold',
          );
        })
        .catch(() => {
          // Leave the failed hold open for retry without blocking other candidates in this batch.
          new Logger('StockExpiry').error({
            event: 'stock.expiry_item_failed',
            holdId: candidate.id,
          });
        });
  }
}
