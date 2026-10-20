import { Module } from '@nestjs/common';
import { OrganizationModule } from '../organization/organization.module.js';
import { CustomerAccess } from './customer-access.js';
import { ReceivableCore } from './receivable-core.js';
import { CustomerService } from './customer.service.js';
import { CustomerStatements } from './customer-statements.js';
import { CustomerRetention } from './customer-retention.js';
import { CustomerController } from './customer.controller.js';
@Module({
  imports: [OrganizationModule],
  providers: [
    CustomerAccess,
    ReceivableCore,
    CustomerService,
    CustomerStatements,
    CustomerRetention,
  ],
  controllers: [CustomerController],
  exports: [CustomerAccess, ReceivableCore],
})
export class CustomerModule {}
