import { DatabaseModule } from '../database/database.module.js';
import { StockPlanningController } from './stock-planning.controller.js';
import { StockPlanningService } from './stock-planning.service.js';
import { StockHoldsService } from './stock-holds.service.js';
import { StockExpiry } from './stock-expiry.js';
import { Module } from '@nestjs/common';
import { OrganizationModule } from '../organization/organization.module.js';
import { CatalogModule } from '../catalog/catalog.module.js';
import { LedgerCore } from './ledger-core.js';
import { ReservationCore } from './reservation-core.js';
import { InventoryService } from './inventory.service.js';
import { InventoryQueries } from './inventory-queries.js';
import { InventoryController } from './inventory.controller.js';
@Module({
  imports: [DatabaseModule, OrganizationModule, CatalogModule],
  controllers: [StockPlanningController, InventoryController],
  providers: [
    StockExpiry,
    StockPlanningService,
    StockHoldsService,
    LedgerCore,
    ReservationCore,
    InventoryService,
    InventoryQueries,
  ],
  exports: [LedgerCore, ReservationCore],
})
export class InventoryModule {}
