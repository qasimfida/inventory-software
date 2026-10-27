import { cloneElement, useSyncExternalStore } from 'react';
import type { ReactElement } from 'react';
import { demoController, demoRoles } from '@inventory/api-client/mock';
import type { DemoRole, DemoScenario } from '@inventory/api-client/mock';
import { Select } from '@/components/ui/FormControls';
/** Loaded only by the explicit development flag. Never contains real account data. */
export default function DemoWorkspace({ children }: { children: ReactElement }) {
  const generation = useSyncExternalStore(demoController.subscribe, demoController.getSnapshot);
  return (
    <>
      <aside className="demo-toolbar" aria-label="Demonstration controls">
        <strong>Demo · local data</strong>
        <label>
          Role{' '}
          <Select
            aria-label="Role"
            value={demoController.role}
            onChange={(e) =>
              demoController.configure(e.target.value as DemoRole, demoController.scenario)
            }
          >
            {demoRoles.map((role) => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
          </Select>
        </label>
        <label>
          Scenario{' '}
          <Select
            aria-label="Scenario"
            value={demoController.scenario}
            onChange={(e) =>
              demoController.configure(demoController.role, e.target.value as DemoScenario)
            }
          >
            {[
              'normal',
              'empty',
              'error',
              'offline',
              'denied',
              'stale',
              'partial',
              'slow',
              'rate-limited',
              'store-live',
              'store-all-clear',
              'store-no-catalog',
              'store-disabled',
              'store-sold-out-hidden',
            ].map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </Select>
        </label>
        <span>No live requests. Transaction actions require a live test API.</span>
      </aside>
      {cloneElement(children, { key: generation })}
    </>
  );
}
