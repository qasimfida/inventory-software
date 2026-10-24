import { Module } from '@nestjs/common';
import { OrganizationModule } from '../organization/organization.module.js';
import { AccountingController } from './accounting.controller.js';
import { AccountingService } from './accounting.service.js';
@Module({
  imports: [OrganizationModule],
  controllers: [AccountingController],
  providers: [AccountingService],
})
export class AccountingModule {}
