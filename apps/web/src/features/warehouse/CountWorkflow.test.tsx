// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createDemoSeed } from '../../../../../packages/api-client/src/mock/seed';
const { request } = vi.hoisted(() => ({ request: vi.fn() }));
vi.mock('@/platform/auth-client', () => ({ authClient: { organizationRequest: request } }));
import { CountWorkflow } from './CountWorkflow';
afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});
it('resumes a saved count without writing stock and keeps review actions separate', async () => {
  const seed = createDemoSeed(0, 'owner');
  const detail = seed.counts[0]!;
  request.mockImplementation(async (path: string) =>
    path.endsWith(`/${detail.count.id}`) ? detail : { counts: [detail.count] },
  );
  render(
    <CountWorkflow
      business={seed.business}
      warehouseId={detail.count.warehouseId}
      sourceId=""
      product={null}
      unitId=""
      run={async (work) => {
        await work();
      }}
    />,
  );
  await userEvent.click(screen.getByRole('button', { name: 'List saved count sessions' }));
  await userEvent.click(await screen.findByRole('button', { name: /^Resume / }));
  expect(screen.getByRole('region', { name: 'Count lines' })).toBeTruthy();
  for (const name of [
    'Save / replace selected count line',
    'Submit complete count for review',
    'Start full recount with new stock snapshot',
    'Owner: approve reviewed adjustments',
  ]) {
    expect(screen.getByRole('button', { name })).toBeTruthy();
  }
  expect(request.mock.calls.every((call) => !call[1] || call[1] === 'GET')).toBe(true);
});
