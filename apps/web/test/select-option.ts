import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
/** Exercise the visible Radix interaction; the native adapter only maps existing fixture values. */
export async function selectOption(trigger: HTMLElement, value: string) {
  const native = trigger.previousElementSibling;
  const option =
    native instanceof HTMLSelectElement
      ? [...native.options].find((o) => o.value === value || o.textContent === value)
      : undefined;
  if (!option) throw new Error(`Missing select option: ${value}`);
  await userEvent.click(trigger);
  await userEvent.click(
    await screen.findByRole('option', { name: option.textContent ?? String(value) }),
  );
}
