import { expect, test } from '@playwright/test';
test('drawer edge supports dragging, keyboard bounds, reset and narrow-screen forms', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await page.getByLabel('Account email').fill('owner@demo.example.test');
  await page.getByLabel('Password', { exact: true }).fill('local-demo');
  await page.getByRole('button', { name: 'Log in', exact: true }).click();
  await page.evaluate(() => {
    location.hash = '/inventory';
  });
  await page.getByRole('button', { name: 'New product', exact: true }).click();
  const drawer = page.getByRole('dialog', { name: 'Add product', exact: true });
  const handle = drawer.getByRole('separator', { name: 'Resize drawer' });
  await page.getByLabel('Product name', { exact: true }).fill('Retained draft');
  await expect(handle).toBeVisible();
  const original = (await drawer.boundingBox())!.width;
  await expect.poll(async () => Math.round((await drawer.boundingBox())!.x)).toBe(1440 - original);
  const edge = (await handle.boundingBox())!;
  await page.mouse.move(edge.x + 5, 250);
  await page.mouse.down();
  await page.mouse.move(edge.x - 155, 250, { steps: 8 });
  await page.mouse.up();
  await expect
    .poll(async () => (await drawer.boundingBox())!.width)
    .toBeGreaterThan(original + 100);
  await handle.focus();
  await page.keyboard.press('Home');
  await expect.poll(async () => (await drawer.boundingBox())!.width).toBe(320);
  await page.keyboard.press('ArrowLeft');
  await expect.poll(async () => (await drawer.boundingBox())!.width).toBe(336);
  await page.keyboard.press('End');
  await expect.poll(async () => (await drawer.boundingBox())!.width).toBe(1408);
  await handle.dblclick({ position: { x: 5, y: 240 } });
  await expect.poll(async () => (await drawer.boundingBox())!.width).toBe(original);
  await expect(page.getByLabel('Product name', { exact: true })).toHaveValue('Retained draft');
  await drawer.evaluate((el) => {
    el.scrollTop = el.scrollHeight;
  });
  await expect(handle).toBeInViewport();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(handle).toBeHidden();
  await expect.poll(async () => (await drawer.boundingBox())!.width).toBe(390);
  await expect(page.getByLabel('Product name', { exact: true })).toHaveValue('Retained draft');
  await page.keyboard.press('Escape');
  await expect(drawer).toHaveCount(0);
});
test('showcase drawer remembers its width while mounted and keeps focus/dismissal behavior', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/#/design-system');
  await page.getByRole('button', { name: 'Open example form drawer', exact: true }).click();
  const drawer = page.getByRole('dialog', { name: 'Example form drawer', exact: true });
  const handle = drawer.getByRole('separator', { name: 'Resize drawer' });
  await handle.focus();
  await page.keyboard.press('Home');
  await page.keyboard.press('ArrowLeft');
  await expect.poll(async () => (await drawer.boundingBox())!.width).toBe(336);
  await drawer.getByRole('button', { name: 'Done', exact: true }).click();
  await expect(drawer).toHaveCount(0);
  await page.getByRole('button', { name: 'Open example form drawer', exact: true }).click();
  await expect.poll(async () => (await drawer.boundingBox())!.width).toBe(336);
  await page.keyboard.press('Escape');
  await expect(drawer).toHaveCount(0);
});
