import type { PreferencePatch } from '@inventory/contracts';
import { AppState, Platform } from 'react-native';
import { useReducedMotion } from './settings/useReducedMotion';
import { settingsModel } from './settings/model';
import { defaultPreferences, resolveSettings } from '@inventory/contracts';
import { createContext, useContext, useEffect, useState, useSyncExternalStore } from 'react';
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
  appearance: 'light',
  setAppearance: () => {},
});
/** preview is local presentation for the showcase, never a business-policy override. */
export function ThemeProvider({
  children,
  preview = false,
  previewPreferences,
}: {
  children: ReactNode;
  preview?: boolean;
  previewPreferences?: PreferencePatch;
}) {
  const [guest, setGuest] = useState<Appearance>('light');
  const reducedMotion = useReducedMotion();
  const state = useSyncExternalStore(
    settingsModel.subscribe,
    settingsModel.snapshot,
    settingsModel.snapshot,
  );
  const preferences = resolveSettings(
    !preview && state.accountId
      ? state.snapshot?.preferences.values
      : { appearance: guest, ...previewPreferences },
    preview ? {} : state.snapshot?.platform.values,
    preview ? {} : state.business?.values,
    { reducedMotion, touch: true },
  );
  useEffect(() => {
    if (preview || !state.accountId) return;
    void settingsModel.refreshRates();
    const timer = setInterval(() => void settingsModel.refreshRates(), 60000);
    const subscription = AppState.addEventListener('change', (value) => {
      if (value === 'active') void settingsModel.refreshRates();
    });
    return () => {
      clearInterval(timer);
      subscription.remove();
    };
  }, [preview, state.accountId]);
  const locked = !preview && state.busy;
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
    default: base.accent,
    teal: base['primary-teal'],
    violet: base['primary-violet'],
    rose: base['primary-rose'],
    amber: base['primary-amber'],
  };
  const accent = accents[context.preferences.accent];
  const density = context.preferences.density;
  const controlSize = context.preferences.controlSize ?? 'medium';
  const tokens = {
    ...base,
    accent,
    primary: accent,
    'navigation-selected': accent,
    'navigation-selected-foreground': base['accent-foreground'],
    ring: accent,
    link: accent,
    'chart-1': accent,
    'control-height': base[`${controlSize}-control-height`],
    'control-padding': base[`${controlSize}-control-padding`],
    'selection-size': base[`${controlSize}-selection-size`],
    'quantity-size': base[`${controlSize}-quantity-size`],
  };
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
      small: parseFloat(base[`${density}-space-small`]),
      medium: parseFloat(base[`${density}-space-medium`]),
      large: parseFloat(base[`${density}-space-large`]),
    },
    radius: parseFloat(
      context.preferences.radius === 'circle'
        ? tokens['surface-radius-circle']
        : tokens['surface-radius'],
    ),
    controlRadius: parseFloat(
      context.preferences.radius === 'circle' ? tokens['radius-circle'] : tokens.radius,
    ),
  };
}
