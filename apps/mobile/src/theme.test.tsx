// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { palettes } from '@inventory/design-tokens';
import { Text } from 'react-native';
vi.mock('react-native', () => vi.importActual('react-native-web'));
vi.mock('./settings/useReducedMotion', () => ({ useReducedMotion: () => false }));
import { ThemeProvider, useTheme } from './theme';
afterEach(cleanup);
function Probe() {
  const theme = useTheme();
  return <Text testID="palette">{JSON.stringify(theme.tokens)}</Text>;
}
for (const appearance of ['light', 'dark'] as const) {
  it(`updates native primary/navigation colors while preserving ${appearance} status semantics`, () => {
    const view = render(
      <ThemeProvider preview previewPreferences={{ appearance, accent: 'teal' }}>
        <Probe />
      </ThemeProvider>,
    );
    for (const accent of ['default', 'teal', 'violet', 'rose', 'amber'] as const) {
      view.rerender(
        <ThemeProvider preview previewPreferences={{ appearance, accent }}>
          <Probe />
        </ThemeProvider>,
      );
      const tokens = JSON.parse(screen.getByTestId('palette').textContent);
      const base = palettes[appearance];
      const expected = accent === 'default' ? base.accent : base[`primary-${accent}`];
      expect(tokens.primary).toBe(expected);
      expect(tokens['navigation-selected']).toBe(expected);
      expect(tokens['navigation-selected-foreground']).toBe(base['accent-foreground']);
      expect(tokens.destructive).toBe(base.destructive);
      expect(tokens.warning).toBe(base.warning);
      expect(tokens.success).toBe(base.success);
    }
  });
}

it('native monetary display keeps original values and shows an equivalent using the shared rate snapshot', async () => {
  const { settingsModel } = await import('./settings/model');
  const { useDisplayMoney } = await import('./ui/useDisplayMoney');
  const now = Date.now();
  const original = settingsModel.snapshot();
  const spy = vi.spyOn(settingsModel, 'snapshot').mockReturnValue({
    ...original,
    rates: {
      reason: null,
      snapshot: {
        source: 'Open Exchange Rates',
        base: 'USD',
        asOf: new Date(now).toISOString(),
        fetchedAt: new Date(now).toISOString(),
        expiresAt: new Date(now + 86400000).toISOString(),
        rates: { USD: '1', PKR: '280' },
      },
    },
  });
  function MoneyProbe() {
    const money = useDisplayMoney();
    return <Text>{money.formatDecimalPrice('3', 'USD')}</Text>;
  }
  try {
    render(
      <ThemeProvider preview previewPreferences={{ currency: 'PKR' }}>
        <MoneyProbe />
      </ThemeProvider>,
    );
    expect(screen.getByText('$3.00 (≈ PKR 840.00)')).toBeTruthy();
  } finally {
    cleanup();
    spy.mockRestore();
  }
});
