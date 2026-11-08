import { useSyncExternalStore } from 'react';
import { moneyFormatters } from '@inventory/api-client';
import { settingsModel } from '@/platform/settings';
import { useAppearance } from './Appearance';
export function useDisplayMoney() {
  const state = useSyncExternalStore(settingsModel.subscribe, settingsModel.snapshot);
  return moneyFormatters(useAppearance().preferences.currency, state);
}
