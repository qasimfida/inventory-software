// @vitest-environment jsdom
vi.mock('react-native-safe-area-context', () => import('./safe-area-test-adapter'));
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import { defaultPreferences } from '@inventory/contracts';
const device = vi.hoisted(() => ({ dark: false, reduced: false }));
vi.mock('react-native', async () => ({
  ...(await vi.importActual<object>('react-native-web')),
  useColorScheme: () => (device.dark ? 'dark' : 'light'),
}));
vi.mock('../settings/useReducedMotion', () => ({ useReducedMotion: () => device.reduced }));
import { ThemeProvider, useTheme } from '../theme';
import { settingsModel } from '../settings/model';
import { Text } from './Themed';
import { Field, Action } from './Controls';
import { LoadingState, EmptyState } from './AsyncState';
import { ScreenHeader } from './ScreenHeader';
function Sample() {
  const theme = useTheme();
  return (
    <>
      <ScreenHeader title="Scaled heading" />
      <Text>Scaled body</Text>
      <Text style={{ fontVariant: ['tabular-nums'] }}>9007199254740993</Text>
      <Field label="Draft" value="Unchanged" onChange={() => {}} />
      <Action label="Saving" loading onPress={() => {}} />
      <LoadingState message="Loading records…" />
      <EmptyState message="No records." announce />
      <Text testID="theme">
        {JSON.stringify({
          mode: theme.mode,
          ring: theme.tokens.ring,
          primary: theme.tokens.primary,
          spacing: theme.spacing.medium,
          large: theme.spacing.large,
        })}
      </Text>
    </>
  );
}
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  device.reduced = false;
  device.dark = false;
});
it('applies all supported typography, accent, density and motion combinations without changing drafts', () => {
  const initial = settingsModel.snapshot();
  const snapshot = vi.spyOn(settingsModel, 'snapshot');
  const save = vi.spyOn(settingsModel, 'save');
  let count = 0;
  for (const appearance of ['light', 'dark', 'system'] as const)
    for (const textSize of ['small', 'medium', 'large'] as const)
      for (const accent of ['default', 'teal'] as const)
        for (const motion of ['enabled', 'reduced', 'disabled'] as const)
          for (const density of ['compact', 'comfortable'] as const) {
            const enhanced = count++ % 2 === 0;
            snapshot.mockReturnValue({
              ...initial,
              accountId: 'presentation-test',
              snapshot: {
                preferences: {
                  version: 1,
                  values: {
                    ...defaultPreferences,
                    appearance,
                    textSize,
                    accent,
                    motion,
                    density,
                    states: enhanced ? 'enhanced' : 'simple',
                    effects: enhanced,
                    visualizations: enhanced ? 'enhanced' : 'simple',
                  },
                },
                platform: { version: 0, values: { defaults: {}, enforced: {}, notifications: {} } },
                canManagePlatform: false,
                connectivity: {
                  online: true,
                  offlineCash: 'bounded-grant',
                  localNetwork: 'deployment-required',
                },
              },
            });
            const { unmount } = render(
              <ThemeProvider>
                <Sample />
              </ThemeProvider>,
            );
            const scale = textSize === 'small' ? 0.9 : textSize === 'large' ? 1.2 : 1;
            expect(
              parseFloat(getComputedStyle(screen.getByText('Scaled heading')).fontSize),
            ).toBeCloseTo(28 * scale);
            expect(
              parseFloat(getComputedStyle(screen.getByText('Scaled body')).fontSize),
            ).toBeCloseTo(16 * scale);
            expect(
              parseFloat(getComputedStyle(screen.getByLabelText('Draft')).fontSize),
            ).toBeCloseTo(16 * scale);
            expect(screen.getByLabelText('Draft').getAttribute('value')).toBe('Unchanged');
            expect(getComputedStyle(screen.getByText('9007199254740993')).fontVariant).toContain(
              'tabular-nums',
            );
            const theme = JSON.parse(screen.getByTestId('theme').textContent);
            expect(theme.mode).toBe(appearance === 'dark' ? 'dark' : 'light');
            expect(theme.ring).toBe(theme.primary);
            expect(theme.spacing).toBe(density === 'compact' ? 12 : 16);
            expect(
              within(screen.getByRole('button', { name: 'Saving' })).queryAllByRole('progressbar'),
            ).toHaveLength(motion === 'enabled' ? 1 : 0);
            expect(screen.getByText('Loading records…').getAttribute('aria-live')).toBe('polite');
            expect(screen.getByText('No records.').getAttribute('aria-live')).toBe('polite');
            expect(getComputedStyle(screen.getByText('No records.').parentElement!).padding).toBe(
              enhanced ? `${theme.large}px` : '0px',
            );
            unmount();
          }
  expect(count).toBe(108);
  expect(save).not.toHaveBeenCalled();
}, 30000);
it('follows a dark system and suppresses the spinner under OS reduced motion', () => {
  device.dark = true;
  device.reduced = true;
  render(
    <ThemeProvider>
      <Sample />
    </ThemeProvider>,
  );
  expect(JSON.parse(screen.getByTestId('theme').textContent).mode).toBe('dark');
  expect(screen.getByRole('progressbar').getAttribute('aria-valuenow')).toBeNull();
  expect(screen.getByRole('progressbar').style.animation).toBe('');
});
