import { Body, Controller, Inject, Param, ParseUUIDPipe, Post, Req } from '@nestjs/common';
import { customerPaymentSchema } from '@inventory/contracts';
import type { CustomerPayment } from '@inventory/contracts';
import type { AuthRequest } from '../auth/auth.http.js';
import { requestActor } from '../http/actor.js';
import { SchemaPipe } from '../http/schema.pipe.js';
import { CustomerPayments } from './customer-payments.js';
@Controller('businesses/:businessId')
export class PaymentController {
  constructor(@Inject(CustomerPayments) private readonly customers: CustomerPayments) {}
  @Post('customers/:id/payments') collect(
    @Req() r: AuthRequest,
    @Param('businessId', new ParseUUIDPipe()) b: string,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body(new SchemaPipe(customerPaymentSchema)) input: CustomerPayment,
  ) {
    return this.customers.collect(requestActor(r), b, id, input);
  }
}
