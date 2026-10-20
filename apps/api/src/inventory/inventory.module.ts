import { Module } from '@nestjs/common';
import { OrganizationModule } from '../organization/organization.module.js';
import { CatalogModule } from '../catalog/catalog.module.js';
import { LedgerCore } from './ledger-core.js';
import { ReservationCore } from './reservation-core.js';
import { InventoryService } from './inventory.service.js';
import { InventoryQueries } from './inventory-queries.js';
import { InventoryController } from './inventory.controller.js';
@Module({
  imports: [OrganizationModule, CatalogModule],
  controllers: [InventoryController],
  providers: [LedgerCore, ReservationCore, InventoryService, InventoryQueries],
  exports: [LedgerCore, ReservationCore],
})
export class InventoryModule {}
