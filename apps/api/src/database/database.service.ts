import { Inject, Injectable, Logger } from '@nestjs/common';
import type { BeforeApplicationShutdown, OnApplicationShutdown } from '@nestjs/common';
import pg from 'pg';
import { ENVIRONMENT } from '../config/environment.js';
import type { Environment } from '../config/environment.js';
import { poolOptions } from './pool-options.js';
import { inTransaction } from './transaction.js';
import type { Transaction } from './transaction.js';

@Injectable()
export class DatabaseService implements BeforeApplicationShutdown, OnApplicationShutdown {
  private readonly pool: pg.Pool;
  private draining = false;
  private closing: Promise<void> | undefined;

  constructor(@Inject(ENVIRONMENT) environment: Environment) {
    this.pool = new pg.Pool(poolOptions(environment));
    this.pool.on('error', () =>
      new Logger(DatabaseService.name).error({ event: 'database.pool_error' }),
    );
  }

  query<Row extends pg.QueryResultRow = pg.QueryResultRow>(text: string, values?: unknown[]) {
    if (this.draining) return Promise.reject(new Error('Database is shutting down.'));
    return this.pool.query<Row>(text, values);
  }

  transaction<T>(work: (transaction: Transaction) => Promise<T>): Promise<T> {
    if (this.draining) return Promise.reject(new Error('Database is shutting down.'));
    return inTransaction(this.pool, work);
  }

  async isReady(): Promise<boolean> {
    if (this.draining) return false;
    try {
      await this.query('SELECT 1');
      return !this.draining;
    } catch {
      return false;
    }
  }

  beforeApplicationShutdown() {
    this.draining = true;
  }

  onApplicationShutdown() {
    this.draining = true;
    this.closing ??= this.pool.end();
    return this.closing;
  }
}
