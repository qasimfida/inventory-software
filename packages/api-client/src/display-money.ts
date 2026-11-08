import { onlinePrice } from './online-products.js';
import type { posPriceLabel as originalPriceLabel } from './pos-presentation.js';
import { displayMoney } from '@inventory/domain';
import type { SettingsState } from './settings/model.js';
/** Presentation only. Callers must keep original currency/amount for edits, exports and commands. */
export function moneyFormatters(
  target: string,
  state: Pick<SettingsState, 'rates' | 'ratesOnline'>,
  now = Date.now(),
) {
  const { snapshot } = state.rates;
  const formatDecimalPrice = (amount: string, currency: string) =>
    displayMoney({ amount, currency, units: 'decimal' }, target, snapshot, now, !state.ratesOnline)
      .text;
  return {
    onlinePrice: (p: Parameters<typeof onlinePrice>[0]) =>
      onlinePrice(
        p,
        (amount, currency) =>
          displayMoney(
            { amount, currency, units: 'minor' },
            target,
            snapshot,
            now,
            !state.ratesOnline,
          ).text,
      ),
    posPriceLabel: (item: Parameters<typeof originalPriceLabel>[0]) =>
      item.price
        ? `${formatDecimalPrice(item.price.unitPrice, item.price.currency)} / ${item.price.unit} · base price`
        : 'Price unavailable',
    formatMinorUnits: (amount: string, currency: string) =>
      displayMoney({ amount, currency, units: 'minor' }, target, snapshot, now, !state.ratesOnline)
        .text,
    formatDecimalPrice: (amount: string, currency: string) =>
      displayMoney(
        { amount, currency, units: 'decimal' },
        target,
        snapshot,
        now,
        !state.ratesOnline,
      ).text,
    notice:
      snapshot && Date.parse(snapshot.expiresAt) > now
        ? `Display estimates: ${target} · Open Exchange Rates · as of ${new Date(snapshot.asOf).toLocaleString()}${state.ratesOnline ? '' : ' · cached offline'}. Original amounts remain payable; estimates are not settlement rates.`
        : `Display estimates: ${target} · ${state.rates.reason === 'not-configured' ? 'Rate source not configured' : snapshot ? 'Rates are stale' : 'Rates unavailable'}. Original currencies are shown; payment amounts are unchanged.`,
  };
}
