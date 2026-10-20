import { Module } from '@nestjs/common';
import { ConfigurationModule } from '../config/configuration.module.js';
import { DatabaseService } from './database.service.js';

@Module({
  imports: [ConfigurationModule],
  providers: [DatabaseService],
  exports: [DatabaseService],
})
export class DatabaseModule {}
