import { TransferDraft } from './transfer-draft.js';
import { transferAddLineSchema } from '@inventory/contracts';
import type { TransferAddLine } from '@inventory/contracts';
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
  transferInputSchema,
  transferTransitionSchema,
  transferReceiveSchema,
  transferQuerySchema,
} from '@inventory/contracts';
import type {
  TransferInput,
  TransferTransition,
  TransferReceive,
  TransferQuery,
} from '@inventory/contracts';
import type { AuthRequest } from '../auth/auth.http.js';
import { requestActor } from '../http/actor.js';
import { SchemaPipe } from '../http/schema.pipe.js';
import { TransferService } from './transfer.service.js';
import { TransferReceiving } from './transfer-receiving.js';
import { TransferQueries } from './transfer-queries.js';
@Controller('businesses/:businessId/transfers')
export class TransferController {
  constructor(
    @Inject(TransferDraft) private readonly draft: TransferDraft,
    @Inject(TransferService) private readonly service: TransferService,
    @Inject(TransferReceiving) private readonly receiving: TransferReceiving,
    @Inject(TransferQueries) private readonly queries: TransferQueries,
  ) {}
  @Post(':id/lines') addLine(
    @Req() r: AuthRequest,
    @Param('businessId', new ParseUUIDPipe()) b: string,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body(new SchemaPipe(transferAddLineSchema)) input: TransferAddLine,
  ) {
    return this.draft.addLine(requestActor(r), b, id, input);
  }
  @Get('') route0(
    @Req() r: AuthRequest,
    @Param('businessId', new ParseUUIDPipe()) b: string,
    @Query(new SchemaPipe(transferQuerySchema)) input: TransferQuery,
  ) {
    return this.queries.load(requestActor(r), b, input);
  }
  @Get(':id') route1(
    @Req() r: AuthRequest,
    @Param('businessId', new ParseUUIDPipe()) b: string,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.queries.detail(requestActor(r), b, id);
  }
  @Post('') route2(
    @Req() r: AuthRequest,
    @Param('businessId', new ParseUUIDPipe()) b: string,
    @Body(new SchemaPipe(transferInputSchema)) input: TransferInput,
  ) {
    return this.service.create(requestActor(r), b, input);
  }
  @Post(':id/transitions') route3(
    @Req() r: AuthRequest,
    @Param('businessId', new ParseUUIDPipe()) b: string,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body(new SchemaPipe(transferTransitionSchema)) input: TransferTransition,
  ) {
    return this.service.transition(requestActor(r), b, id, input);
  }
  @Post(':id/receipts') route4(
    @Req() r: AuthRequest,
    @Param('businessId', new ParseUUIDPipe()) b: string,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body(new SchemaPipe(transferReceiveSchema)) input: TransferReceive,
  ) {
    return this.receiving.receive(requestActor(r), b, id, input);
  }
}
