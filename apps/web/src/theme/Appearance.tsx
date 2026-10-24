import {
  createContext,
  useContext,
  useId,
  useEffect,
  useState,
  useSyncExternalStore,
  useMemo,
} from 'react';
import type { ReactNode } from 'react';
import type { Appearance } from '@inventory/design-tokens';
import { defaultPreferences, resolveSettings } from '@inventory/contracts';
import { Select } from '@/components/ui/FormControls';
import { settingsModel } from '@/platform/settings';
const Context = createContext<{
  appearance: Appearance;
  preferences: typeof defaultPreferences;
  locked: boolean;
  setAppearance: (value: Appearance) => void;
}>({
  appearance: 'system',
  preferences: defaultPreferences,
  locked: false,
  setAppearance: () => {},
});
export const useAppearance = () => useContext(Context);
/** preview isolates developer examples; normal callers keep account policy/persistence. */
export function AppearanceProvider({
  children,
  preview = false,
}: {
  children: ReactNode;
  preview?: boolean;
}) {
  const [guest, setGuest] = useState<Appearance>('system');
  const state = useSyncExternalStore(settingsModel.subscribe, settingsModel.snapshot);
  const preferences = useMemo(
    () =>
      !preview && state.accountId
        ? resolveSettings(
            state.snapshot?.preferences.values,
            state.snapshot?.platform.values,
            state.business?.values,
          )
        : { ...defaultPreferences, appearance: guest },
    [state, guest, preview],
  );
  const locked =
    !preview &&
    (state.busy ||
      !!state.snapshot?.platform.values.enforced.appearance ||
      !!state.business?.values.enforced.appearance);
  function setAppearance(value: Appearance) {
    if (locked) return;
    if (!preview && state.accountId) void settingsModel.save({ appearance: value });
    else setGuest(value);
  }
  useEffect(() => {
    const previous = { ...document.documentElement.dataset };
    const previousFont = document.documentElement.style.getPropertyValue('--font-family-sans');
    const dark = window.matchMedia?.('(prefers-color-scheme: dark)');
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    const apply = () => {
      const effective = resolveSettings(
        preferences,
        {},
        {},
        { reducedMotion: reduced?.matches ?? false },
      );
      const root = document.documentElement;
      const font = effective.font;
      root.style.setProperty(
        '--font-family-sans',
        font === 'system'
          ? 'ui-sans-serif, system-ui, sans-serif'
          : font === 'serif'
            ? 'ui-serif, Georgia, serif'
            : font === 'monospace'
              ? 'ui-monospace, monospace'
              : `"${font.replace(/^local:/, '')}", system-ui, sans-serif`,
      );
      root.dataset.theme =
        effective.appearance === 'system'
          ? dark?.matches
            ? 'dark'
            : 'light'
          : effective.appearance;
      root.dataset.motion = effective.motion;
      root.dataset.density = effective.density;
      root.dataset.textSize = effective.textSize;
      root.dataset.iconSize = effective.iconSize;
      root.dataset.accent = effective.accent;
      root.dataset.effects = String(effective.effects);
      root.dataset.states = effective.states;
      root.dataset.radius = effective.radius;
    };
    apply();
    dark?.addEventListener('change', apply);
    reduced?.addEventListener('change', apply);
    return () => {
      dark?.removeEventListener('change', apply);
      reduced?.removeEventListener('change', apply);
      if (preview) {
        const root = document.documentElement;
        if (previousFont) root.style.setProperty('--font-family-sans', previousFont);
        else root.style.removeProperty('--font-family-sans');
        for (const key of [
          'theme',
          'motion',
          'density',
          'textSize',
          'iconSize',
          'accent',
          'effects',
          'states',
          'radius',
        ]) {
          if (previous[key] === undefined) delete root.dataset[key];
          else root.dataset[key] = previous[key];
        }
      }
    };
  }, [preferences, preview]);
  return (
    <Context.Provider
      value={{ appearance: preferences.appearance, preferences, locked, setAppearance }}
    >
      {children}
    </Context.Provider>
  );
}
export function AppearanceControl() {
  const id = useId(),
    { appearance, setAppearance, locked } = useAppearance();
  return (
    <label htmlFor={id} className="flex items-center gap-2 text-sm">
      Appearance
      <Select
        id={id}
        aria-label="Appearance"
        value={appearance}
        disabled={locked}
        onChange={(event) => {
          const value = event.target.value;
          if (value === 'light' || value === 'dark' || value === 'system') setAppearance(value);
        }}
      >
        <option value="system">System</option>
        <option value="light">Light</option>
        <option value="dark">Dark</option>
      </Select>
    </label>
  );
}
