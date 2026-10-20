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
import {
  storageInputSchema,
  storageUpdateSchema,
  storageQuerySchema,
  storageMoveSchema,
} from '@inventory/contracts';
import type { StorageInput, StorageQuery, StorageMove } from '@inventory/contracts';
import type { AuthRequest } from '../auth/auth.http.js';
import { requestActor } from '../http/actor.js';
import { SchemaPipe } from '../http/schema.pipe.js';
import { StorageService } from './storage.service.js';
@Controller('businesses/:businessId/storage')
export class StorageController {
  constructor(@Inject(StorageService) private readonly service: StorageService) {}
  @Get() load(
    @Req() r: AuthRequest,
    @Param('businessId', new ParseUUIDPipe()) b: string,
    @Query(new SchemaPipe(storageQuerySchema)) q: StorageQuery,
  ) {
    return this.service.load(requestActor(r), b, q);
  }
  @Post() create(
    @Req() r: AuthRequest,
    @Param('businessId', new ParseUUIDPipe()) b: string,
    @Body(new SchemaPipe(storageInputSchema)) input: StorageInput,
  ) {
    return this.service.save(requestActor(r), b, input);
  }
  @Patch(':id') update(
    @Req() r: AuthRequest,
    @Param('businessId', new ParseUUIDPipe()) b: string,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body(new SchemaPipe(storageUpdateSchema)) input: StorageInput & { version: number },
  ) {
    return this.service.save(requestActor(r), b, input, id, input.version);
  }
  @Post('moves') move(
    @Req() r: AuthRequest,
    @Param('businessId', new ParseUUIDPipe()) b: string,
    @Body(new SchemaPipe(storageMoveSchema)) input: StorageMove,
  ) {
    return this.service.move(requestActor(r), b, input);
  }
}
