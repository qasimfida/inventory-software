import { Controller, Get, Post, Inject, Param, ParseUUIDPipe, Query, Req } from '@nestjs/common';
import { notificationQuerySchema, queueQuerySchema } from '@inventory/contracts';
import type { z } from 'zod';
import type { AuthRequest } from '../auth/auth.http.js';
import { requestActor } from '../http/actor.js';
import { SchemaPipe } from '../http/schema.pipe.js';
import { NotificationsService } from './notifications.service.js';
@Controller('businesses/:businessId/notifications')
export class NotificationsController {
  constructor(@Inject(NotificationsService) private readonly service: NotificationsService) {}
  @Get() inbox(
    @Req() r: AuthRequest,
    @Param('businessId', new ParseUUIDPipe()) b: string,
    @Query(new SchemaPipe(notificationQuerySchema)) q: z.infer<typeof notificationQuerySchema>,
  ) {
    return this.service.inbox(requestActor(r), b, q.cursor, q.search, q.status);
  }
  @Post(':id/read') read(
    @Req() r: AuthRequest,
    @Param('businessId', new ParseUUIDPipe()) b: string,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.service.read(requestActor(r), b, id);
  }
  @Get('approvals') approvals(
    @Req() r: AuthRequest,
    @Param('businessId', new ParseUUIDPipe()) b: string,
    @Query(new SchemaPipe(queueQuerySchema)) q: z.infer<typeof queueQuerySchema>,
  ) {
    return this.service.approvals(requestActor(r), b, q.offset);
  }
  @Get('failures') failures(
    @Req() r: AuthRequest,
    @Param('businessId', new ParseUUIDPipe()) b: string,
  ) {
    return this.service.failures(requestActor(r), b);
  }
  @Post(':id/retry') retry(
    @Req() r: AuthRequest,
    @Param('businessId', new ParseUUIDPipe()) b: string,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.service.retry(requestActor(r), b, id);
  }
}
