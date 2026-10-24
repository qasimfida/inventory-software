import { deliverQueue } from '../notifications/deliver.js';
import { Inject, Injectable, Logger } from '@nestjs/common';
import type { OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { DatabaseService } from '../database/database.service.js';
@Injectable()
export class NotificationWorker implements OnModuleInit, OnModuleDestroy {
  private timer: ReturnType<typeof setInterval> | undefined;
  private running: Promise<void> | undefined;
  constructor(@Inject(DatabaseService) private readonly db: DatabaseService) {}
  onModuleInit() {
    this.timer = setInterval(() => {
      void this.flush().catch(() => {
        new Logger('SecurityDelivery').error({ event: 'notifications.worker_unavailable' });
      });
    }, 5000);
    this.timer.unref();
  }
  async onModuleDestroy() {
    clearInterval(this.timer);
    await this.running?.catch(() => undefined);
  }
  flush(): Promise<void> {
    this.running ??= this.deliver().finally(() => {
      this.running = undefined;
    });
    return this.running;
  }
  private async deliver() {
    await deliverQueue(this.db, 'security_deliveries');
    await deliverQueue(this.db, 'business_deliveries');
    await this.db.query(`DELETE FROM diagnostic_events WHERE id IN
      (SELECT id FROM diagnostic_events WHERE occurred_at<now()-interval '30 days' LIMIT 1000)`);
  }
}
