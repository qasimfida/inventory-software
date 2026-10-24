import { Controller, Inject, Param, ParseUUIDPipe, Post, Req } from '@nestjs/common';
import type { AuthRequest } from '../auth/auth.http.js';
import { requestActor } from '../http/actor.js';
import { CatalogLiveAccess } from './catalog-live-access.js';
@Controller('businesses/:businessId/catalog-live')
export class CatalogLiveController {
  constructor(@Inject(CatalogLiveAccess) private readonly access: CatalogLiveAccess) {}
  @Post('ticket') ticket(
    @Req() req: AuthRequest,
    @Param('businessId', new ParseUUIDPipe()) businessId: string,
  ) {
    return this.access.issue({ businessId, sessionId: req.identity.id, actor: requestActor(req) });
  }
}
