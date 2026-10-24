import { defaultPreferences } from '@inventory/contracts';
import type { Preferences } from '@inventory/contracts';
import { createDemoSeed } from './seed.js';
import type { DemoRole, DemoScenario } from './identity.js';
export const demoState = {
  role: 'owner' as DemoRole,
  scenario: 'normal' as DemoScenario,
  authenticated: false,
  generation: 0,
  seeds: [createDemoSeed(0, 'owner'), createDemoSeed(1, 'owner')],
  preferences: new Map<DemoRole, { version: number; values: Preferences }>(),
};
const listeners = new Set<() => void>();
export const demoController = {
  getSnapshot: () => demoState.generation,
  subscribe: (listener: () => void) => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
  get role() {
    return demoState.role;
  },
  get scenario() {
    return demoState.scenario;
  },
  configure(role: DemoRole, scenario: DemoScenario) {
    demoState.role = role;
    demoState.scenario = scenario;
    demoState.seeds = [createDemoSeed(0, role), createDemoSeed(1, role)];
    demoState.authenticated = true;
    demoState.generation += 1;
    listeners.forEach((listener) => listener());
  },
};
export function demoPreferences() {
  return (
    demoState.preferences.get(demoState.role) ?? { version: 0, values: { ...defaultPreferences } }
  );
}
