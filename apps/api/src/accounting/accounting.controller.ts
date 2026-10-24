import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import {
  periodInputSchema,
  journalInputSchema,
  sourcePostSchema,
  accountingActionSchema,
  reversalSchema,
  stage6PageQuery,
} from '@inventory/contracts';
import type {
  PeriodInput,
  JournalInput,
  SourcePost,
  AccountingAction,
  Reversal,
} from '@inventory/contracts';
import type { AuthRequest } from '../auth/auth.http.js';
import { requestActor } from '../http/actor.js';
import { SchemaPipe } from '../http/schema.pipe.js';
import { AccountingService } from './accounting.service.js';
@Controller('businesses/:businessId/accounting')
export class AccountingController {
  constructor(@Inject(AccountingService) private readonly service: AccountingService) {}
  @Get() list(
    @Req() req: AuthRequest,
    @Param('businessId', new ParseUUIDPipe()) b: string,
    @Query(new SchemaPipe(stage6PageQuery)) q: { offset: number },
  ) {
    return this.service.list(requestActor(req), b, q.offset);
  }
  @Post('periods') period(
    @Req() req: AuthRequest,
    @Param('businessId', new ParseUUIDPipe()) b: string,
    @Body(new SchemaPipe(periodInputSchema)) input: PeriodInput,
  ) {
    return this.service.period(requestActor(req), b, input);
  }
  @Post('periods/:id/close') close(
    @Req() req: AuthRequest,
    @Param('businessId', new ParseUUIDPipe()) b: string,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body(new SchemaPipe(accountingActionSchema)) input: AccountingAction,
  ) {
    return this.service.close(requestActor(req), b, id, input);
  }
  @Post('journals') manual(
    @Req() req: AuthRequest,
    @Param('businessId', new ParseUUIDPipe()) b: string,
    @Body(new SchemaPipe(journalInputSchema)) input: JournalInput,
  ) {
    return this.service.manual(requestActor(req), b, input);
  }
  @Post('sources') source(
    @Req() req: AuthRequest,
    @Param('businessId', new ParseUUIDPipe()) b: string,
    @Body(new SchemaPipe(sourcePostSchema)) input: SourcePost,
  ) {
    return this.service.source(requestActor(req), b, input);
  }
  @Post('journals/:id/reverse') reverse(
    @Req() req: AuthRequest,
    @Param('businessId', new ParseUUIDPipe()) b: string,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body(new SchemaPipe(reversalSchema)) input: Reversal,
  ) {
    return this.service.reverse(requestActor(req), b, id, input);
  }
}
