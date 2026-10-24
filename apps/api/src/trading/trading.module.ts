import { Module } from '@nestjs/common';
import { OrganizationModule } from '../organization/organization.module.js';
import { TradingController } from './trading.controller.js';
import { TradingService } from './trading.service.js';
@Module({
  imports: [OrganizationModule],
  controllers: [TradingController],
  providers: [TradingService],
})
export class TradingModule {}
