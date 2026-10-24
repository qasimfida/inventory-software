/* global location, document */
import { chromium, expect } from '@playwright/test';
import { writeFile } from 'node:fs/promises';
import axe from 'axe-core';
const browser = await chromium.launch({ channel: 'chrome' }),
  results = [];
try {
  for (const width of [1440, 390]) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto('http://127.0.0.1:5188');
    await page.getByLabel('Account email').fill('owner@demo.example.test');
    await page.getByLabel('Password', { exact: true }).fill('local-demo');
    await page.getByRole('button', { name: 'Log in', exact: true }).click();
    await page.getByRole('region', { name: 'Business dashboard' }).waitFor();
    await page.evaluate(() => (location.hash = '/pos'));
    await page.locator('.product-card').first().waitFor();
    const buttons = page.locator('.product-card').getByRole('button', { name: /Add/ });
    const count = await buttons.count();
    for (let i = 0; i < count; i++) await buttons.nth(i).click();
    const checkout = page
      .locator('.pos-checkout-footer')
      .getByRole('button', { name: 'Checkout', exact: true });
    await expect(checkout).toBeEnabled();
    await checkout.scrollIntoViewIfNeeded();
    const body = page.locator('.pos-cart-scroll');
    const overflowing = await body.evaluate((e) => e.scrollHeight > e.clientHeight);
    expect(overflowing).toBe(true);
    const before = await checkout.boundingBox();
    await body.evaluate((e) => {
      e.scrollTop = e.scrollHeight;
    });
    const after = await checkout.boundingBox();
    expect(Math.abs(after.y - before.y)).toBeLessThan(1);
    await checkout.click();
    await expect(page.getByLabel('Cash tendered (minor units)', { exact: true })).toBeVisible();
    await page.screenshot({
      path: `docs/qa/shell-business-directory/cart-${width}.png`,
      animations: 'disabled',
    });
    await page.evaluate(axe.source);
    const violations = await page.evaluate(async () =>
      (
        await axe.run(document.querySelector('.pos-cart'), {
          runOnly: ['wcag2a', 'wcag2aa', 'wcag21aa'],
        })
      ).violations.map((v) => ({ id: v.id, impact: v.impact })),
    );
    expect(violations).toEqual([]);
    expect(errors).toEqual([]);
    results.push({
      width,
      cartItems: count,
      overflowing,
      checkoutVisible: true,
      violations,
      errors,
      saleSubmitted: false,
    });
    await page.close();
  }
  await writeFile(
    'docs/qa/shell-business-directory/cart-results.json',
    JSON.stringify(results, null, 2),
  );
} finally {
  await browser.close();
}
