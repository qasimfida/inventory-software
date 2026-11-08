# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: product-details.spec.ts >> catalog detail tabs show product-scoped data and honest channels at desktop and narrow widths
- Location: tests/shell/product-details.spec.ts:2:1

# Error details

```
Error: expect(locator).toContainText(expected) failed

Locator: getByRole('region', { name: 'Product detail', exact: true })
Expected substring: "storefront publishing has not been implemented"
Received string:    "Oak dining chair · Natural 1HP-001activeOnlineOverviewStockPricingHistoryChannelsPoint of saleActive catalog product. POS availability also requires an active variant, a valid price, warehouse access and applicable stock rules.Online storeCentral storeNeeds changesView issues and actionsRemove from store…"
Timeout: 5000ms

Call log:
  - Expect "toContainText" getByRole('region', { name: 'Product detail', exact: true }) with timeout 5000ms
  - waiting for getByRole('region', { name: 'Product detail', exact: true })
    - locator resolved to <section aria-label="Product detail" class="screen-section space-y-4">…</section>
    - unexpected value "Oak dining chair · Natural 1HP-001activeOnlineOverviewStockPricingHistoryChannelsPoint of saleActive catalog product. POS availability also requires an active variant, a valid price, warehouse access and applicable stock rules.Online storeCentral storeNot listed"
    13 × locator resolved to <section aria-label="Product detail" class="screen-section space-y-4">…</section>
       - unexpected value "Oak dining chair · Natural 1HP-001activeOnlineOverviewStockPricingHistoryChannelsPoint of saleActive catalog product. POS availability also requires an active variant, a valid price, warehouse access and applicable stock rules.Online storeCentral storeNeeds changesView issues and actionsRemove from store…"

```

```yaml
- region "Product detail":
  - heading "Oak dining chair · Natural 1" [level=2]
  - text: HP-001 active Online
  - tablist "Product detail sections":
    - tab "Overview"
    - tab "Stock"
    - tab "Pricing"
    - tab "History"
    - tab "Channels" [selected]
  - tabpanel "Channels":
    - heading "Point of sale" [level=3]
    - paragraph: Active catalog product. POS availability also requires an active variant, a valid price, warehouse access and applicable stock rules.
    - heading "Online store" [level=3]
    - heading "Central store" [level=4]
    - text: Needs changes
    - button "View issues and actions"
    - button "Remove from store…"
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | test('catalog detail tabs show product-scoped data and honest channels at desktop and narrow widths', async ({
  3  |   page,
  4  | }) => {
  5  |   await page.goto('/');
  6  |   await page.getByLabel('Account email').fill('owner@demo.example.test');
  7  |   await page.getByLabel('Password', { exact: true }).fill('local-demo');
  8  |   await page.getByRole('button', { name: 'Log in', exact: true }).click();
  9  |   await expect(page.getByRole('navigation', { name: 'Business setup' })).toBeVisible();
  10 |   await page.evaluate(() => {
  11 |     location.hash = '/catalog';
  12 |   });
  13 |   await page
  14 |     .getByRole('button', { name: 'View details for Oak dining chair · Natural 1', exact: true })
  15 |     .first()
  16 |     .click();
  17 |   await page.getByRole('link', { name: 'Open full product details' }).click();
  18 |   const detail = page.getByRole('region', { name: 'Product detail', exact: true });
  19 |   await expect(detail.getByRole('heading', { name: 'Oak dining chair · Natural 1' })).toBeVisible();
  20 |   await detail.getByRole('tab', { name: 'Stock', exact: true }).click();
  21 |   await expect(detail.getByRole('table')).toContainText('HP-001');
  22 |   await expect(detail.getByRole('table')).not.toContainText('HP-002');
  23 |   await page.screenshot({ path: 'artifacts/qa/screens/milestone-3/web-stock.png', fullPage: true });
  24 |   await detail.getByRole('tab', { name: 'History' }).click();
  25 |   await expect(detail).toContainText('Demonstration opening balance');
  26 |   await detail.getByRole('tab', { name: 'Pricing' }).click();
  27 |   await expect(detail).toContainText('HP-001');
  28 |   await detail.getByRole('tab', { name: 'Channels' }).click();
> 29 |   await expect(detail).toContainText('storefront publishing has not been implemented');
     |                        ^ Error: expect(locator).toContainText(expected) failed
  30 |   await page.setViewportSize({ width: 390, height: 844 });
  31 |   await detail.getByRole('tab', { name: 'Overview' }).click();
  32 |   await expect(detail.getByRole('button', { name: 'Edit product details' })).toBeVisible();
  33 |   expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
  34 |   await page.screenshot({
  35 |     path: 'artifacts/qa/screens/milestone-3/web-overview-narrow.png',
  36 |     fullPage: true,
  37 |   });
  38 | });
  39 | 
```