import { Platform } from 'react-native';
import { useReducedMotion } from './settings/useReducedMotion';
import { settingsModel } from './settings/model';
import { defaultPreferences, resolveSettings } from '@inventory/contracts';
import { createContext, useContext, useState, useSyncExternalStore } from 'react';
import type { ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import { palettes } from '@inventory/design-tokens';
import type { Appearance } from '@inventory/design-tokens';

const Context = createContext<{
  preferences: typeof defaultPreferences;
  locked: boolean;
  appearance: Appearance;
  setAppearance: (value: Appearance) => void;
}>({
  preferences: defaultPreferences,
  locked: false,
  appearance: 'system',
  setAppearance: () => {},
});
/** preview is local presentation for the showcase, never a business-policy override. */
export function ThemeProvider({
  children,
  preview = false,
}: {
  children: ReactNode;
  preview?: boolean;
}) {
  const [guest, setGuest] = useState<Appearance>('system');
  const reducedMotion = useReducedMotion();
  const state = useSyncExternalStore(
    settingsModel.subscribe,
    settingsModel.snapshot,
    settingsModel.snapshot,
  );
  const preferences = resolveSettings(
    !preview && state.accountId ? state.snapshot?.preferences.values : { appearance: guest },
    preview ? {} : state.snapshot?.platform.values,
    preview ? {} : state.business?.values,
    { reducedMotion },
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
  return (
    <Context.Provider
      value={{ appearance: preferences.appearance, preferences, locked, setAppearance }}
    >
      {children}
    </Context.Provider>
  );
}
export function useTheme() {
  const context = useContext(Context);
  const system = useColorScheme();
  const mode =
    context.appearance === 'system' ? (system === 'dark' ? 'dark' : 'light') : context.appearance;
  const base = palettes[mode];
  const accents = {
    default: base.primary,
    teal: base['primary-teal'],
    violet: base['primary-violet'],
    rose: base['primary-rose'],
    amber: base['primary-amber'],
  };
  const accent = accents[context.preferences.accent];
  const tint = (percent: number, surface: string = base.card) =>
    '#' +
    [1, 3, 5]
      .map((offset) =>
        Math.round(
          parseInt(accent.slice(offset, offset + 2), 16) * percent +
            parseInt(surface.slice(offset, offset + 2), 16) * (1 - percent),
        )
          .toString(16)
          .padStart(2, '0'),
      )
      .join('');
  const tokens = {
    ...base,
    primary: accent,
    ring: accent,
    selected: tint(0.15),
    secondary: tint(0.08),
    'secondary-foreground': accent,
    'chart-1': accent,
    'selected-foreground': tint(0.8, base.foreground),
    'navigation-selected': tint(0.15),
    'navigation-selected-foreground': tint(0.8, base.foreground),
    'navigation-hover': tint(0.08),
    'table-selected': tint(0.15),
    'table-hover': tint(0.08),
    sidebar: tint(0.03),
  };
  const density = context.preferences.density === 'compact' ? 0.75 : 1;
  return {
    ...context,
    mode,
    iconSize: parseFloat(tokens[`icon-${context.preferences.iconSize}`]),
    fontFamily:
      context.preferences.font === 'system'
        ? undefined
        : context.preferences.font === 'serif'
          ? Platform.OS === 'ios'
            ? 'Georgia'
            : 'serif'
          : context.preferences.font === 'monospace'
            ? Platform.OS === 'ios'
              ? 'Menlo'
              : 'monospace'
            : context.preferences.font.startsWith('local:')
              ? undefined
              : context.preferences.font,
    tokens,
    colors: {
      background: tokens.background,
      foreground: tokens.foreground,
      muted: tokens['muted-foreground'],
      primary: tokens.primary,
      onPrimary: tokens['primary-foreground'],
      error: tokens.destructive,
      card: tokens.card,
      border: tokens.input,
    },
    spacing: {
      small: parseFloat(tokens['space-small']) * density,
      medium: parseFloat(tokens['space-medium']) * density,
      large: parseFloat(tokens['space-large']) * density,
    },
    radius: parseFloat(tokens.radius) * (context.preferences.radius === 'circle' ? 2 : 1),
    controlRadius: parseFloat(
      context.preferences.radius === 'circle' ? tokens['radius-circle'] : tokens.radius,
    ),
  };
}
