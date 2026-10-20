import { CountModule } from './counts/count.module.js';
import { SyncModule } from './sync/sync.module.js';
import { SalesModule } from './sales/sales.module.js';
import { PaymentModule } from './payments/payment.module.js';
import { CustomerModule } from './customers/customer.module.js';
import { TransferModule } from './transfers/transfer.module.js';
import { StorageModule } from './storage/storage.module.js';
import { PurchasingModule } from './purchasing/purchasing.module.js';
import { InventoryModule } from './inventory/inventory.module.js';
import { CatalogModule } from './catalog/catalog.module.js';
import { Module } from '@nestjs/common';
import { ConfigurationModule } from './config/configuration.module.js';
import { HealthModule } from './health/health.module.js';

import { AuthModule } from './auth/auth.module.js';

import { OrganizationModule } from './organization/organization.module.js';

@Module({
  imports: [
    CountModule,
    ConfigurationModule,
    HealthModule,
    AuthModule,
    OrganizationModule,
    CatalogModule,
    InventoryModule,
    PurchasingModule,
    StorageModule,
    TransferModule,
    CustomerModule,
    PaymentModule,
    SalesModule,
    SyncModule,
  ],
})
export class AppModule {}
