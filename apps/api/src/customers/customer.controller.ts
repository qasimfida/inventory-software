import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { z } from 'zod';
import {
  customerInputSchema,
  customerUpdateSchema,
  customerCreditSchema,
  customerQuerySchema,
  retentionSchema,
} from '@inventory/contracts';
import type { CustomerInput, CustomerCredit, CustomerQuery } from '@inventory/contracts';
import type { AuthRequest } from '../auth/auth.http.js';
import { requestActor } from '../http/actor.js';
import { SchemaPipe } from '../http/schema.pipe.js';
import { CustomerService } from './customer.service.js';
import { CustomerStatements } from './customer-statements.js';
import { CustomerRetention } from './customer-retention.js';
@Controller('businesses/:businessId/customers')
export class CustomerController {
  constructor(
    @Inject(CustomerService) private readonly service: CustomerService,
    @Inject(CustomerStatements) private readonly statements: CustomerStatements,
    @Inject(CustomerRetention) private readonly retention: CustomerRetention,
  ) {}
  @Get() page(
    @Req() r: AuthRequest,
    @Param('businessId', new ParseUUIDPipe()) b: string,
    @Query(new SchemaPipe(customerQuerySchema)) q: CustomerQuery,
  ) {
    return this.service.page(requestActor(r), b, q);
  }
  @Post() create(
    @Req() r: AuthRequest,
    @Param('businessId', new ParseUUIDPipe()) b: string,
    @Body(new SchemaPipe(customerInputSchema)) input: CustomerInput,
  ) {
    return this.service.save(requestActor(r), b, input);
  }
  @Patch(':id') update(
    @Req() r: AuthRequest,
    @Param('businessId', new ParseUUIDPipe()) b: string,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body(new SchemaPipe(customerUpdateSchema)) input: CustomerInput & { version: number },
  ) {
    return this.service.save(requestActor(r), b, input, id, input.version);
  }
  @Patch(':id/credit') credit(
    @Req() r: AuthRequest,
    @Param('businessId', new ParseUUIDPipe()) b: string,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body(new SchemaPipe(customerCreditSchema)) input: CustomerCredit,
  ) {
    return this.service.policy(requestActor(r), b, id, input);
  }
  @Get(':id/statement') statement(
    @Req() r: AuthRequest,
    @Param('businessId', new ParseUUIDPipe()) b: string,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Query(
      new SchemaPipe(
        z.object({ offset: z.coerce.number().int().min(0).max(100000).default(0) }).strict(),
      ),
    )
    q: { offset: number },
  ) {
    return this.statements.read(requestActor(r), b, id, q.offset);
  }
  @Get('retention/policy') policy(
    @Req() r: AuthRequest,
    @Param('businessId', new ParseUUIDPipe()) b: string,
  ) {
    return this.retention.read(requestActor(r), b);
  }
  @Patch('retention/policy') savePolicy(
    @Req() r: AuthRequest,
    @Param('businessId', new ParseUUIDPipe()) b: string,
    @Body(new SchemaPipe(retentionSchema)) input: { inactiveDays: number; version: number },
  ) {
    return this.retention.save(requestActor(r), b, input);
  }
  @Post('retention/run') runRetention(
    @Req() r: AuthRequest,
    @Param('businessId', new ParseUUIDPipe()) b: string,
    @Body(new SchemaPipe(z.object({}).strict())) input: Record<string, never>,
  ) {
    void input;
    return this.retention.run(requestActor(r), b);
  }
}
