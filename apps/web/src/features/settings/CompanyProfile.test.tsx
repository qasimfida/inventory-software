// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { companyProfileSchema, policyRecordSchema } from '@inventory/contracts';
import { CompanyProfile } from './CompanyProfile';
import { settingsModel } from '@/platform/settings';
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
it('removes palette controls without deleting stored branding or rewriting preferences', async () => {
  const business = {
    id: '00000000-0000-4000-8000-000000000001',
    name: 'Business',
    state: 'active' as const,
    role: 'owner' as const,
    version: 1,
  };
  const company = companyProfileSchema.parse({
    displayName: 'Example business',
    palette: ['teal'],
  });
  const policy = policyRecordSchema.parse({
    version: 2,
    values: { company, defaults: { accent: 'rose' } },
  });
  const snapshot = { ...settingsModel.snapshot(), businessId: business.id, business: policy };
  vi.spyOn(settingsModel, 'snapshot').mockReturnValue(snapshot);
  const save = vi.spyOn(settingsModel, 'policy').mockResolvedValue(undefined);
  render(<CompanyProfile business={business} />);
  expect(screen.queryByText('Business palette')).toBeNull();
  await userEvent.click(screen.getByRole('button', { name: 'Save company profile' }));
  expect(save).toHaveBeenCalledWith({ version: 2, values: policy.values }, false);
});
