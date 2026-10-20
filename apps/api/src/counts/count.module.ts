import { ScanController } from './scan.controller.js';
import { Module } from '@nestjs/common';
import { OrganizationModule } from '../organization/organization.module.js';
import { InventoryModule } from '../inventory/inventory.module.js';
import { CountController } from './count.controller.js';
import { CountService } from './count.service.js';
import { CountApproval } from './count-approval.js';
@Module({
  imports: [OrganizationModule, InventoryModule],
  controllers: [CountController, ScanController],
  providers: [CountService, CountApproval],
})
export class CountModule {}
