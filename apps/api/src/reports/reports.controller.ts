import { Controller, Get, Inject, Param, ParseUUIDPipe, Query, Req } from '@nestjs/common';
import { reportQuerySchema, dashboardQuerySchema } from '@inventory/contracts';
import type { ReportQuery, DashboardQuery } from '@inventory/contracts';
import { DashboardService } from './dashboard.service.js';
import type { AuthRequest } from '../auth/auth.http.js';
import { requestActor } from '../http/actor.js';
import { SchemaPipe } from '../http/schema.pipe.js';
import { ReportsService } from './reports.service.js';
@Controller('businesses/:businessId/reports')
export class ReportsController {
  constructor(
    @Inject(ReportsService) private readonly reports: ReportsService,
    @Inject(DashboardService) private readonly dashboard: DashboardService,
  ) {}
  @Get('overview') overview(
    @Req() req: AuthRequest,
    @Param('businessId', new ParseUUIDPipe()) b: string,
    @Query(new SchemaPipe(dashboardQuerySchema)) query: DashboardQuery,
  ) {
    return this.dashboard.load(requestActor(req), b, query);
  }
  @Get() load(
    @Req() req: AuthRequest,
    @Param('businessId', new ParseUUIDPipe()) b: string,
    @Query(new SchemaPipe(reportQuerySchema)) query: ReportQuery,
  ) {
    return this.reports.load(requestActor(req), b, query);
  }
}
