import { Inject, Injectable } from '@nestjs/common';
import type { OnApplicationBootstrap } from '@nestjs/common';
import { ENVIRONMENT } from '../config/environment.js';
import type { Environment } from '../config/environment.js';
import { DatabaseService } from '../database/database.service.js';
@Injectable()
export class ProductionGuard implements OnApplicationBootstrap {
  constructor(
    @Inject(ENVIRONMENT) private readonly environment: Pick<Environment, 'NODE_ENV'>,
    @Inject(DatabaseService) private readonly database: Pick<DatabaseService, 'query'>,
  ) {}
  async onApplicationBootstrap() {
    if (this.environment.NODE_ENV !== 'production') return;
    const result = await this.database.query(
      "SELECT 1 FROM platform_audit WHERE action='development.fixtures.v1' LIMIT 1",
    );
    if (result.rowCount)
      throw new Error(
        'Production cannot start with development fixtures. Provision a clean production database.',
      );
  }
}
