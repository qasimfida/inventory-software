// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
vi.mock('react-native-safe-area-context', () => import('./safe-area-test-adapter'));
vi.mock('react-native', () => vi.importActual('react-native-web'));
import { defaultPreferences } from '@inventory/contracts';
import { palettes } from '@inventory/design-tokens';
import { settingsModel } from '../settings/model';
import { ThemeProvider } from '../theme';
import { Surface } from './Surface';
import { MetricCard } from './MetricCard';
import { StatusBadge } from './StatusBadge';
import { Text } from './Themed';
import { Field } from './Controls';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
it.each(['rounded', 'circle'] as const)(
  'resolves %s for native cards and badges without saving preferences',
  (radius) => {
    const initial = settingsModel.snapshot();
    vi.spyOn(settingsModel, 'snapshot').mockReturnValue({
      ...initial,
      accountId: 'radius-test',
      snapshot: {
        preferences: { version: 1, values: { ...defaultPreferences, radius } },
        platform: { version: 0, values: { defaults: {}, enforced: {}, notifications: {} } },
        canManagePlatform: false,
        connectivity: {
          online: true,
          offlineCash: 'bounded-grant',
          localNetwork: 'deployment-required',
        },
      },
    });
    const save = vi.spyOn(settingsModel, 'save');
    render(
      <ThemeProvider>
        <Surface>
          <Text>Card body</Text>
        </Surface>
        <Field label="Product name" value="Unchanged" onChange={() => {}} />
        <MetricCard label="Stock" value="12" unit="Units" tone="warning" />
        <StatusBadge label="Low stock" tone="warning" />
      </ThemeProvider>,
    );
    const expected = parseFloat(palettes.light.radius) * (radius === 'circle' ? 2 : 1);
    for (const text of ['Card body', 'Stock'])
      expect(
        parseFloat(getComputedStyle(screen.getByText(text).parentElement!).borderTopLeftRadius),
      ).toBe(expected);
    const badgeRadius =
      radius === 'circle' ? parseFloat(palettes.light['radius-circle']) : expected;
    expect(
      parseFloat(
        getComputedStyle(screen.getByText('Low stock').parentElement!).borderTopLeftRadius,
      ),
    ).toBe(badgeRadius);
    expect(
      parseFloat(getComputedStyle(screen.getByLabelText('Product name')).borderTopLeftRadius),
    ).toBe(badgeRadius);
    expect(screen.getByLabelText('Product name').getAttribute('value')).toBe('Unchanged');
    expect(save).not.toHaveBeenCalled();
  },
);
