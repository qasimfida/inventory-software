import { expect, it, vi } from 'vitest';
import { organizationFixture } from '../../test/organization-fixture.js';
import { OrganizationScope } from '../organization/organization.scope.js';
import { parseEnvironment } from '../config/environment.js';
import { AiService } from './ai.service.js';
const fixture = organizationFixture();
it('uses real tenant and account checks, sends no tenant records, and blocks revoked output', async () => {
  const f = fixture();
  const config = parseEnvironment({
    ...process.env,
    AI_PROVIDER: 'test',
    AI_MODEL: 'test',
    AI_API_KEY: 'fixture-only',
  });
  const provider = {
    id: 'test',
    generate: vi.fn().mockResolvedValue({ output: { explanation: 'Open a section.' } }),
  };
  const service = new AiService(config, f.application().get(OrganizationScope), provider);
  const actor = { accountId: f.ownerId, requestId: 'ai-integration' };
  await expect(service.explainNavigation(actor, f.b, { question: 'help' })).rejects.toThrow();
  expect(provider.generate).not.toHaveBeenCalled();
  await service.explainNavigation({ ...actor, accountId: f.viewerId }, f.a, { question: 'help' });
  expect(provider.generate.mock.calls[0]?.[0]).toMatchObject({
    untrustedInput: { allowedSections: ['Notifications and approvals'] },
  });
  expect(JSON.stringify(provider.generate.mock.calls)).not.toContain(f.a);
  provider.generate.mockImplementationOnce(async () => {
    await f.db().query("UPDATE auth_accounts SET status='disabled' WHERE id=$1", [f.ownerId]);
    return { output: { explanation: 'Do not return this after revocation.' } };
  });
  await expect(service.explainNavigation(actor, f.a, { question: 'help' })).rejects.toThrow();
  await f.db().query("UPDATE auth_accounts SET status='active' WHERE id=$1", [f.ownerId]);
  expect(f.application().get(AiService).enabled).toBe(false);
});
