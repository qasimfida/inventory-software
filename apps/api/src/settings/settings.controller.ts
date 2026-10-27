import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  ParseUUIDPipe,
  Put,
  Post,
  Req,
} from '@nestjs/common';
import { preferenceRecordSchema, policyRecordSchema } from '@inventory/contracts';
import type { z } from 'zod';
import type { AuthRequest } from '../auth/auth.http.js';
import { requestActor as actor } from '../http/actor.js';
import { SchemaPipe } from '../http/schema.pipe.js';
import { SettingsService } from './settings.service.js';
@Controller()
export class SettingsController {
  constructor(@Inject(SettingsService) private readonly settings: SettingsService) {}
  @Get('businesses/:businessId/setup')
  setup(@Req() req: AuthRequest, @Param('businessId', new ParseUUIDPipe()) id: string) {
    return this.settings.setup(actor(req), id);
  }
  @Post('businesses/:businessId/setup/dismiss')
  dismissSetup(@Req() req: AuthRequest, @Param('businessId', new ParseUUIDPipe()) id: string) {
    return this.settings.dismissSetup(actor(req), id);
  }
  @Get('auth/settings')
  get(@Req() req: AuthRequest) {
    return this.settings.snapshot(actor(req));
  }
  @Put('auth/settings')
  personal(
    @Req() req: AuthRequest,
    @Body(new SchemaPipe(preferenceRecordSchema)) input: z.infer<typeof preferenceRecordSchema>,
  ) {
    return this.settings.preferences(actor(req), input);
  }
  @Put('auth/settings/platform')
  platform(
    @Req() req: AuthRequest,
    @Body(new SchemaPipe(policyRecordSchema)) input: z.infer<typeof policyRecordSchema>,
  ) {
    return this.settings.platform(actor(req), input);
  }
  @Get('businesses/:businessId/settings')
  business(@Req() req: AuthRequest, @Param('businessId', new ParseUUIDPipe()) id: string) {
    return this.settings.business(actor(req), id);
  }
  @Put('businesses/:businessId/settings')
  save(
    @Req() req: AuthRequest,
    @Param('businessId', new ParseUUIDPipe()) id: string,
    @Body(new SchemaPipe(policyRecordSchema)) input: z.infer<typeof policyRecordSchema>,
  ) {
    return this.settings.business(actor(req), id, input);
  }
}
