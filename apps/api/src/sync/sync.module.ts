import { Module } from '@nestjs/common';
import { OrganizationModule } from '../organization/organization.module.js';
import { InventoryModule } from '../inventory/inventory.module.js';
import { PaymentModule } from '../payments/payment.module.js';
import { SalesModule } from '../sales/sales.module.js';
import { SyncController } from './sync.controller.js';
import { SyncCatalog } from './sync-catalog.js';
import { SyncLeases } from './sync-leases.js';
import { SyncDownload } from './sync-download.js';
import { SyncSales } from './sync-sales.js';
import { SyncUpload } from './sync-upload.js';
@Module({
  imports: [OrganizationModule, InventoryModule, PaymentModule, SalesModule],
  providers: [SyncCatalog, SyncLeases, SyncDownload, SyncSales, SyncUpload],
  controllers: [SyncController],
  exports: [SyncDownload],
})
export class SyncModule {}
