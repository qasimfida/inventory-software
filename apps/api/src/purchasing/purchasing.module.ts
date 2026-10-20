import { Module } from '@nestjs/common';
import { OrganizationModule } from '../organization/organization.module.js';
import { InventoryModule } from '../inventory/inventory.module.js';
import { PurchasingService } from './purchasing.service.js';
import { PurchaseReceiving } from './purchase-receiving.js';
import { PurchaseQueries } from './purchase-queries.js';
import { PurchasingController } from './purchasing.controller.js';
@Module({
  imports: [OrganizationModule, InventoryModule],
  providers: [PurchasingService, PurchaseReceiving, PurchaseQueries],
  controllers: [PurchasingController],
})
export class PurchasingModule {}
