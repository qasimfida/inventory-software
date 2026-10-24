import { Text } from '../ui/Themed';
import { useSyncExternalStore } from 'react';
import type { Business } from '@inventory/contracts';
import { hasPermission, defaultIndustry, industryConventions } from '@inventory/contracts';
import { settingsModel } from './model';
import { PolicyEditor } from './PolicyEditor';
export function BusinessPolicy({ business }: { business: Business }) {
  const state = useSyncExternalStore(
    settingsModel.subscribe,
    settingsModel.snapshot,
    settingsModel.snapshot,
  );
  if (!state.business || state.businessId !== business.id) return null;
  const profile = state.business.values.industry ?? defaultIndustry,
    conventions = industryConventions[profile.kind];
  return (
    <>
      <Text>
        {conventions.label} · {conventions.customer} · {conventions.purchase}
      </Text>
      {hasPermission(business, 'business.write') && (
        <PolicyEditor key={`${business.id}-${state.business.version}`} policy={state.business} />
      )}
    </>
  );
}
