import { HttpException, Inject, Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service.js';
import { tokenHash } from './secrets.js';

@Injectable()
export class RateLimitService {
  constructor(@Inject(DatabaseService) private readonly database: DatabaseService) {}
  async consume(key: string, limit: number) {
    const result = await this.database.query<{ attempts: number }>(
      `INSERT INTO auth_rate_limits(key_hash,attempts,resets_at)
      VALUES($1,1,now()+interval '15 minutes') ON CONFLICT(key_hash) DO UPDATE SET
      attempts=CASE WHEN auth_rate_limits.resets_at<=now() THEN 1 ELSE LEAST(auth_rate_limits.attempts+1,1000000) END,
      resets_at=CASE WHEN auth_rate_limits.resets_at<=now() THEN now()+interval '15 minutes' ELSE auth_rate_limits.resets_at END
      RETURNING attempts`,
      [tokenHash(key)],
    );
    if (result.rows[0]!.attempts > limit) throw new HttpException('Too many requests.', 429);
  }
}
