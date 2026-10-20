import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
  Req,
} from '@nestjs/common';
import { z } from 'zod';
import {
  offlinePolicySchema,
  prepareOfflineSchema,
  uploadSchema,
  deltaQuerySchema,
} from '@inventory/contracts';
import type { OfflinePolicy, OfflineSale, DeltaQuery } from '@inventory/contracts';
import type { AuthRequest } from '../auth/auth.http.js';
import { requestActor } from '../http/actor.js';
import { SchemaPipe } from '../http/schema.pipe.js';
import { SyncLeases } from './sync-leases.js';
import { SyncDownload } from './sync-download.js';
import { SyncUpload } from './sync-upload.js';
@Controller('businesses/:businessId/sync')
export class SyncController {
  constructor(
    @Inject(SyncLeases) private readonly leases: SyncLeases,
    @Inject(SyncDownload) private readonly download: SyncDownload,
    @Inject(SyncUpload) private readonly upload: SyncUpload,
  ) {}
  @Get('identity') identity(
    @Req() r: AuthRequest,
    @Param('businessId', new ParseUUIDPipe()) b: string,
  ) {
    return this.leases.identity(requestActor(r), b);
  }
  @Get('policy') policy(
    @Req() r: AuthRequest,
    @Param('businessId', new ParseUUIDPipe()) b: string,
  ) {
    return this.leases.policy(requestActor(r), b);
  }
  @Put('policy') save(
    @Req() r: AuthRequest,
    @Param('businessId', new ParseUUIDPipe()) b: string,
    @Body(new SchemaPipe(offlinePolicySchema)) input: OfflinePolicy,
  ) {
    return this.leases.save(requestActor(r), b, input);
  }
  @Post('prepare') prepare(
    @Req() r: AuthRequest,
    @Param('businessId', new ParseUUIDPipe()) b: string,
    @Body(new SchemaPipe(prepareOfflineSchema))
    input: { warehouseId: string; currency: string; deviceId: string },
  ) {
    return this.leases.prepare(requestActor(r), b, input);
  }
  @Get('events') events(
    @Req() r: AuthRequest,
    @Param('businessId', new ParseUUIDPipe()) b: string,
    @Query(new SchemaPipe(deltaQuerySchema.omit({ cursor: true }))) q: Omit<DeltaQuery, 'cursor'>,
  ) {
    return this.download.head(requestActor(r), b, q.warehouseId);
  }
  @Get('delta') pull(
    @Req() r: AuthRequest,
    @Param('businessId', new ParseUUIDPipe()) b: string,
    @Query(new SchemaPipe(deltaQuerySchema)) q: DeltaQuery,
  ) {
    return this.download.pull(requestActor(r), b, q);
  }
  @Post('upload') batch(
    @Req() r: AuthRequest,
    @Param('businessId', new ParseUUIDPipe()) b: string,
    @Body(new SchemaPipe(uploadSchema)) input: { operations: OfflineSale[] },
  ) {
    return this.upload.batch(requestActor(r), b, input.operations);
  }
  @Post('operations/:id/reconcile') review(
    @Req() r: AuthRequest,
    @Param('businessId', new ParseUUIDPipe()) b: string,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body(new SchemaPipe(z.object({ note: z.string().trim().min(10).max(240) }).strict()))
    input: { note: string },
  ) {
    return this.upload.review(requestActor(r), b, id, input.note);
  }
}
