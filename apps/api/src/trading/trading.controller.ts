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
  tradingInviteSchema,
  tradingConsentSchema,
  tradingOrderInput,
  tradingTransitionSchema,
  stage6PageQuery,
} from '@inventory/contracts';
import type {
  TradingInvite,
  TradingConsent,
  TradingOrderInput,
  TradingTransition,
} from '@inventory/contracts';
import type { AuthRequest } from '../auth/auth.http.js';
import { requestActor } from '../http/actor.js';
import { SchemaPipe } from '../http/schema.pipe.js';
import { TradingService } from './trading.service.js';
@Controller('businesses/:businessId/trading')
export class TradingController {
  constructor(@Inject(TradingService) private readonly service: TradingService) {}
  @Get() list(
    @Req() req: AuthRequest,
    @Param('businessId', new ParseUUIDPipe()) b: string,
    @Query(new SchemaPipe(stage6PageQuery)) q: { offset: number },
  ) {
    return this.service.list(requestActor(req), b, q.offset);
  }
  @Post('relationships') invite(
    @Req() req: AuthRequest,
    @Param('businessId', new ParseUUIDPipe()) b: string,
    @Body(new SchemaPipe(tradingInviteSchema)) input: TradingInvite,
  ) {
    return this.service.invite(requestActor(req), b, input);
  }
  @Post('relationships/:id') consent(
    @Req() req: AuthRequest,
    @Param('businessId', new ParseUUIDPipe()) b: string,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body(new SchemaPipe(tradingConsentSchema)) input: TradingConsent,
  ) {
    return this.service.consent(requestActor(req), b, id, input);
  }
  @Post('orders') create(
    @Req() req: AuthRequest,
    @Param('businessId', new ParseUUIDPipe()) b: string,
    @Body(new SchemaPipe(tradingOrderInput)) input: TradingOrderInput,
  ) {
    return this.service.create(requestActor(req), b, input);
  }
  @Post('orders/:id') transition(
    @Req() req: AuthRequest,
    @Param('businessId', new ParseUUIDPipe()) b: string,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body(new SchemaPipe(tradingTransitionSchema)) input: TradingTransition,
  ) {
    return this.service.transition(requestActor(req), b, id, input);
  }
  @Get('orders/:id/history') history(
    @Req() req: AuthRequest,
    @Param('businessId', new ParseUUIDPipe()) b: string,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Query(new SchemaPipe(stage6PageQuery)) q: { offset: number },
  ) {
    return this.service.history(requestActor(req), b, id, q.offset);
  }
}
