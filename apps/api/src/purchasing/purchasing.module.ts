import { Module } from '@nestjs/common';
import { OrganizationModule } from '../organization/organization.module.js';
import { InventoryModule } from '../inventory/inventory.module.js';
import { PurchasingService } from './purchasing.service.js';
import { PurchaseReceiving } from './purchase-receiving.js';
import { PurchaseQueries } from './purchase-queries.js';
import { PurchasingController } from './purchasing.controller.js';
import { PaymentModule } from '../payments/payment.module.js';
import { PayableService } from './payable.service.js';
import { PayableController } from './payable.controller.js';
import { PurchaseReturns } from './purchase-returns.js';
@Module({
  imports: [OrganizationModule, InventoryModule, PaymentModule],
  providers: [
    PurchasingService,
    PurchaseReceiving,
    PurchaseQueries,
    PayableService,
    PurchaseReturns,
  ],
  controllers: [PurchasingController, PayableController],
})
export class PurchasingModule {}
