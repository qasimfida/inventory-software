import { Inject, Injectable, Logger } from '@nestjs/common';
import type { OnApplicationShutdown } from '@nestjs/common';
import pg from 'pg';
import { ENVIRONMENT } from '../config/environment.js';
import type { Environment } from '../config/environment.js';

@Injectable()
export class DatabaseService implements OnApplicationShutdown {
  private readonly pool: pg.Pool;

  constructor(@Inject(ENVIRONMENT) environment: Environment) {
    this.pool = new pg.Pool({
      connectionString: environment.DATABASE_URL,
      ssl: environment.DATABASE_SSL === 'verify-full' ? { rejectUnauthorized: true } : false,
      max: 10,
      connectionTimeoutMillis: 3000,
      idleTimeoutMillis: 30000,
      statement_timeout: 5000,
    });
    this.pool.on('error', () => new Logger(DatabaseService.name).error('Database pool error'));
  }

  async isReady(): Promise<boolean> {
    try {
      await this.pool.query('SELECT 1');
      return true;
    } catch {
      return false;
    }
  }

  async onApplicationShutdown() {
    await this.pool.end();
  }
}
