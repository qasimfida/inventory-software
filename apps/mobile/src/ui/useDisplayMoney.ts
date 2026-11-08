import { useSyncExternalStore } from 'react';
import { moneyFormatters } from '@inventory/api-client';
import { settingsModel } from '../settings/model';
import { useTheme } from '../theme';
export function useDisplayMoney() {
  const state = useSyncExternalStore(settingsModel.subscribe, settingsModel.snapshot);
  return moneyFormatters(useTheme().preferences.currency, state);
}
