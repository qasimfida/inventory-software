import { it, expect } from 'vitest';
import { authFixture } from '../../test/auth-fixture.js';
import { DatabaseService } from '../database/database.service.js';
import { ProductionGuard } from './production-guard.js';
const fixture = authFixture();
it('refuses production startup against a copied fixture database while allowing clean production data', async () => {
  const db = fixture.application().get(DatabaseService),
    production = new ProductionGuard({ NODE_ENV: 'production' }, db);
  await expect(production.onApplicationBootstrap()).resolves.toBeUndefined();
  const account = await fixture.register('guard@example.test');
  await fixture
    .db()
    .query(
      "INSERT INTO platform_audit(actor_id,target_id,action) VALUES($1,$1,'development.fixtures.v1')",
      [account.user.id],
    );
  await expect(production.onApplicationBootstrap()).rejects.toThrow(
    'Production cannot start with development fixtures',
  );
  await expect(
    new ProductionGuard({ NODE_ENV: 'development' }, db).onApplicationBootstrap(),
  ).resolves.toBeUndefined();
});
