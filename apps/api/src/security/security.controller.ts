import { Controller, Get, Inject, Param, ParseUUIDPipe, Post, Query, Req } from '@nestjs/common';
import { z } from 'zod';
import { requestActor as actor } from '../http/actor.js';
import { SchemaPipe } from '../http/schema.pipe.js';
import type { AuthRequest } from '../auth/auth.http.js';
import { SecurityService } from './security.service.js';
const cursor = new SchemaPipe(
  z
    .string()
    .regex(/^[1-9][0-9]{0,17}$/)
    .optional(),
);
@Controller()
export class SecurityController {
  constructor(@Inject(SecurityService) private readonly service: SecurityService) {}
  @Get('auth/security/events')
  events(@Req() req: AuthRequest, @Query('cursor', cursor) after?: string) {
    return this.service.events(actor(req), after);
  }
  @Get('auth/security/platform/events')
  platform(@Req() req: AuthRequest, @Query('cursor', cursor) after?: string) {
    return this.service.events(actor(req), after, true);
  }
  @Get('businesses/:businessId/security/events')
  business(
    @Req() req: AuthRequest,
    @Param('businessId', new ParseUUIDPipe()) id: string,
    @Query('cursor', cursor) after?: string,
  ) {
    return this.service.business(actor(req), id, after);
  }
  @Get('auth/security/notifications')
  inbox(@Req() req: AuthRequest, @Query('cursor', cursor) after?: string) {
    return this.service.inbox(actor(req), after);
  }
  @Post('auth/security/notifications/:id/read')
  read(@Req() req: AuthRequest, @Param('id', new ParseUUIDPipe()) id: string) {
    return this.service.read(actor(req), id);
  }
  @Get('auth/security/deliveries')
  deliveries(@Req() req: AuthRequest) {
    return this.service.deliveries(actor(req));
  }
  @Post('auth/security/deliveries/:id/retry')
  retry(@Req() req: AuthRequest, @Param('id', new ParseUUIDPipe()) id: string) {
    return this.service.retry(actor(req), id);
  }
  @Get('auth/security/diagnostics')
  diagnostics(@Req() req: AuthRequest) {
    return this.service.diagnostics(actor(req));
  }
}
