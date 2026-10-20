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
import { countCreateSchema, countCaptureSchema, countCommandSchema } from '@inventory/contracts';
import type { CountCreate, CountCapture, CountCommand } from '@inventory/contracts';
import type { AuthRequest } from '../auth/auth.http.js';
import { requestActor } from '../http/actor.js';
import { SchemaPipe } from '../http/schema.pipe.js';
import { CountService } from './count.service.js';
import { CountApproval } from './count-approval.js';
@Controller('businesses/:businessId/counts')
export class CountController {
  constructor(
    @Inject(CountService) private service: CountService,
    @Inject(CountApproval) private approval: CountApproval,
  ) {}
  @Get() list(
    @Req() r: AuthRequest,
    @Param('businessId', new ParseUUIDPipe()) b: string,
    @Query('warehouseId', new ParseUUIDPipe()) warehouseId: string,
  ) {
    return this.service.list(requestActor(r), b, warehouseId);
  }
  @Get(':id') detail(
    @Req() r: AuthRequest,
    @Param('businessId', new ParseUUIDPipe()) b: string,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.service.detail(requestActor(r), b, id);
  }
  @Post() create(
    @Req() r: AuthRequest,
    @Param('businessId', new ParseUUIDPipe()) b: string,
    @Body(new SchemaPipe(countCreateSchema)) input: CountCreate,
  ) {
    return this.service.create(requestActor(r), b, input);
  }
  @Post(':id/capture') capture(
    @Req() r: AuthRequest,
    @Param('businessId', new ParseUUIDPipe()) b: string,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body(new SchemaPipe(countCaptureSchema)) input: CountCapture,
  ) {
    return this.service.capture(requestActor(r), b, id, input);
  }
  @Post(':id/submit') submit(
    @Req() r: AuthRequest,
    @Param('businessId', new ParseUUIDPipe()) b: string,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body(new SchemaPipe(countCommandSchema)) input: CountCommand,
  ) {
    return this.service.transition(requestActor(r), b, id, 'submit', input);
  }
  @Post(':id/recount') recount(
    @Req() r: AuthRequest,
    @Param('businessId', new ParseUUIDPipe()) b: string,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body(new SchemaPipe(countCommandSchema)) input: CountCommand,
  ) {
    return this.service.transition(requestActor(r), b, id, 'recount', input);
  }
  @Post(':id/approve') approve(
    @Req() r: AuthRequest,
    @Param('businessId', new ParseUUIDPipe()) b: string,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body(new SchemaPipe(countCommandSchema)) input: CountCommand,
  ) {
    return this.approval.approve(requestActor(r), b, id, input);
  }
}
