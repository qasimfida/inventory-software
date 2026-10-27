// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
vi.mock('react-native', () => vi.importActual('react-native-web'));
vi.mock('react-native-safe-area-context', () => import('../ui/safe-area-test-adapter'));
import { initialOnlineSettings } from '@inventory/api-client';
import { OnlineSettingsFields } from './OnlineSettingsFields';
const id = '00000000-0000-4000-8000-000000000001';
afterEach(cleanup);
it('native setup keeps the last fulfillment method enabled and renders editable bank instructions only when selected', () => {
  const draft = initialOnlineSettings(id, id, {}),
    edit = vi.fn();
  const view = render(
    <OnlineSettingsFields
      draft={draft}
      section="fulfillment"
      locations={[]}
      disabled={false}
      edit={edit}
    />,
  );
  expect(screen.getByRole<HTMLInputElement>('switch', { name: 'Pickup' }).disabled).toBe(true);
  fireEvent.click(screen.getByRole('switch', { name: 'Manual bank transfer' }));
  expect(edit.mock.calls[0]?.[0].fulfillment.manualBankTransfer.enabled).toBe(true);
  view.rerender(
    <OnlineSettingsFields
      draft={edit.mock.calls[0]![0]}
      section="fulfillment"
      locations={[]}
      disabled={false}
      edit={edit}
    />,
  );
  expect(screen.getByRole('textbox', { name: 'Manual bank transfer instructions' })).toBeTruthy();
});
it('native setup labels contact and safety fields, respects read-only access and keeps policy counters visible', () => {
  const draft = initialOnlineSettings(id, id, {});
  const view = render(
    <OnlineSettingsFields
      draft={draft}
      section="general"
      locations={[]}
      disabled
      edit={() => {}}
    />,
  );
  expect(screen.getByRole<HTMLInputElement>('textbox', { name: 'Store name' }).readOnly).toBe(true);
  expect(screen.getByRole('textbox', { name: 'Safety buffer per SKU' })).toBeTruthy();
  view.rerender(
    <OnlineSettingsFields
      draft={draft}
      section="policies"
      locations={[]}
      disabled
      edit={() => {}}
    />,
  );
  expect(screen.getAllByText(/0 \/ 4000 characters/)).toHaveLength(2);
});
