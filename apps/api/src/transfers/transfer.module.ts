import { TransferDraft } from './transfer-draft.js';
import { Module } from '@nestjs/common';
import { OrganizationModule } from '../organization/organization.module.js';
import { InventoryModule } from '../inventory/inventory.module.js';
import { TransferAccess } from './transfer-access.js';
import { TransferService } from './transfer.service.js';
import { TransferReceiving } from './transfer-receiving.js';
import { TransferQueries } from './transfer-queries.js';
import { TransferController } from './transfer.controller.js';
@Module({
  imports: [OrganizationModule, InventoryModule],
  providers: [TransferDraft, TransferAccess, TransferService, TransferReceiving, TransferQueries],
  controllers: [TransferController],
})
export class TransferModule {}
