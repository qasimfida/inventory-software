import { Module } from '@nestjs/common';
import { OrganizationModule } from '../organization/organization.module.js';
import { InventoryModule } from '../inventory/inventory.module.js';
import { StorageService } from './storage.service.js';
import { StorageController } from './storage.controller.js';
@Module({
  imports: [OrganizationModule, InventoryModule],
  providers: [StorageService],
  controllers: [StorageController],
})
export class StorageModule {}
