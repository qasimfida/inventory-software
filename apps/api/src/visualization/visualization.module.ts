import { Controller, Get, Inject, Module, Param, ParseUUIDPipe, Query, Req } from '@nestjs/common';
import { warehouseViewQuerySchema } from '@inventory/contracts';
import type { WarehouseViewQuery } from '@inventory/contracts';
import { OrganizationModule } from '../organization/organization.module.js';
import { SchemaPipe } from '../http/schema.pipe.js';
import { requestActor } from '../http/actor.js';
import type { AuthRequest } from '../auth/auth.http.js';
import { VisualizationService } from './visualization.service.js';
@Controller('businesses/:businessId/warehouse-view')
class VisualizationController {
  constructor(@Inject(VisualizationService) private readonly service: VisualizationService) {}
  @Get() load(
    @Req() req: AuthRequest,
    @Param('businessId', new ParseUUIDPipe()) b: string,
    @Query(new SchemaPipe(warehouseViewQuerySchema)) q: WarehouseViewQuery,
  ) {
    return this.service.load(requestActor(req), b, q);
  }
}
@Module({
  imports: [OrganizationModule],
  providers: [VisualizationService],
  controllers: [VisualizationController],
})
export class VisualizationModule {}
