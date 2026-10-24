import type { Page } from '@playwright/test';
export async function chooseSelect(page: Page, label: string, value: string) {
  const trigger = page.getByRole('combobox', { name: label, exact: true });
  const text = await trigger.evaluate((el, wanted) => {
    const select = el.previousElementSibling;
    if (!(select instanceof HTMLSelectElement)) throw new Error('Missing select form adapter');
    return [...select.options].find((o) => o.value === wanted || o.textContent === wanted)
      ?.textContent;
  }, value);
  if (!text) throw new Error(`Missing option ${value}`);
  await trigger.click();
  await page.getByRole('option', { name: text, exact: true }).click();
}
