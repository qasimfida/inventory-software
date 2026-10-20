import { CashRefunds } from './cash-refunds.js';
import { ShiftCore } from './shift-core.js';
import { ShiftService } from './shift-service.js';
import { ShiftController } from './shift.controller.js';
import { Module } from '@nestjs/common';
import { OrganizationModule } from '../organization/organization.module.js';
import { CustomerModule } from '../customers/customer.module.js';
import { CashCore } from './cash-core.js';
import { CustomerPayments } from './customer-payments.js';
import { PaymentController } from './payment.controller.js';
@Module({
  imports: [OrganizationModule, CustomerModule],
  providers: [CashRefunds, CashCore, CustomerPayments, ShiftCore, ShiftService],
  controllers: [PaymentController, ShiftController],
  exports: [CashRefunds, CashCore, ShiftCore],
})
export class PaymentModule {}
