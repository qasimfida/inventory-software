import { ReturnLines } from './return-lines.js';
import { SaleReturns } from './sale-returns.js';
import { ReturnsController } from './returns.controller.js';
import { Module } from '@nestjs/common';
import { OrganizationModule } from '../organization/organization.module.js';
import { CatalogModule } from '../catalog/catalog.module.js';
import { InventoryModule } from '../inventory/inventory.module.js';
import { CustomerModule } from '../customers/customer.module.js';
import { PaymentModule } from '../payments/payment.module.js';
import { SalePricing } from './sale-pricing.js';
import { CheckoutService } from './checkout.service.js';
import { SaleQueries } from './sale-queries.js';
import { SalesController } from './sales.controller.js';
@Module({
  imports: [OrganizationModule, CatalogModule, InventoryModule, CustomerModule, PaymentModule],
  providers: [ReturnLines, SaleReturns, SalePricing, CheckoutService, SaleQueries],
  controllers: [SalesController, ReturnsController],
  exports: [CheckoutService, SalePricing],
})
export class SalesModule {}
