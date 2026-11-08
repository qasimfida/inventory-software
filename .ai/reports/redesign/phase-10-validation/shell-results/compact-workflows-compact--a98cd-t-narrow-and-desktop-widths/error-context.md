# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: compact-workflows.spec.ts >> compact collections, POS details and role-safe menus work at narrow and desktop widths
- Location: tests/shell/compact-workflows.spec.ts:3:1

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByRole('heading', { name: 'Business setup shortcuts' })
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" getByRole('heading', { name: 'Business setup shortcuts' }) with timeout 5000ms
  - waiting for getByRole('heading', { name: 'Business setup shortcuts' })

```

```yaml
- complementary "Demonstration controls":
  - strong: Demo · local data
  - text: Role
  - combobox "Role": owner
  - text: Scenario
  - combobox "Scenario": normal
  - text: No live requests. Transaction actions require a live test API.
- link "Skip to page content":
  - /url: "#page-content"
- complementary "Application sidebar":
  - button "Switch workspace": Harbor & Pine Home owner · All authorized locations
  - navigation "Main navigation":
    - link "Online store":
      - /url: "#/online-store"
    - link "Overview":
      - /url: "#/dashboard"
    - heading "Sales" [level=3]:
      - button "Sales" [expanded]
    - region "Sales":
      - link "Point of sale":
        - /url: "#/pos"
      - link "Sales & receipts":
        - /url: "#/sales"
      - link "Cash shifts":
        - /url: "#/cash"
    - heading "Inventory" [level=3]:
      - button "Inventory" [expanded]
    - region "Inventory":
      - link "Categories":
        - /url: "#/categories"
      - link "Inventory":
        - /url: "#/inventory"
      - link "Stock counts & scanning":
        - /url: "#/warehouse"
      - link "Transfers":
        - /url: "#/transfers"
      - link "Warehouse & storage":
        - /url: "#/storage"
    - link "Purchasing & suppliers":
      - /url: "#/purchasing"
    - link "Customers":
      - /url: "#/customers"
    - heading "Finance" [level=3]:
      - button "Finance" [expanded]
    - region "Finance":
      - link "Supplier balances":
        - /url: "#/payables"
      - link "Accounting":
        - /url: "#/accounting"
    - link "Reports":
      - /url: "#/reports"
    - heading "Administration" [level=3]:
      - button "Administration" [expanded]
    - region "Administration":
      - link "Logs":
        - /url: "#/logs"
      - link "Notifications & approvals":
        - /url: "#/notifications"
      - link "Business trading":
        - /url: "#/trading"
      - link "Integrations & help":
        - /url: "#/integrations"
      - link "Expenses":
        - /url: "#/staff"
      - link "Team & permissions":
        - /url: "#/team"
    - heading "Settings" [level=3]:
      - button "Settings" [expanded]
    - region "Settings":
      - link "Profile":
        - /url: "#/settings/profile"
      - link "Company profile":
        - /url: "#/settings/company"
      - link "Business":
        - /url: "#/settings/business"
      - link "Preferences":
        - /url: "#/settings/preferences"
      - link "Security":
        - /url: "#/settings/security"
      - link "Device & Offline":
        - /url: "#/settings/device"
      - link "Security notifications":
        - /url: "#/settings/notifications"
      - link "Stores & terminals":
        - /url: "#/settings/locations"
      - link "Audit history":
        - /url: "#/settings/audit"
  - button "Open profile menu": owner owner
- separator "Resize sidebar"
- button "Collapse sidebar" [expanded]
- banner:
  - heading "Overview" [level=1]
  - button "Workspace warehouse All permitted warehouses"
  - combobox "Search routes and records"
  - link "Online · server reachable":
    - /url: "#/settings/device"
  - button "Theme and colors"
  - button "Notifications, 3 unread in recent page": "3"
- main:
  - navigation "Business setup":
    - heading "Business setup" [level=3]
    - text: 6 of 6 complete
    - paragraph: Manage the company, locations and catalog used by this workspace.
    - link "Business profile · Complete":
      - /url: "#/settings/company"
    - link "Transaction currency · Complete":
      - /url: "#/settings/company"
    - link "Tax defaults · Complete":
      - /url: "#/settings/company"
    - link "Stores and warehouses · Complete":
      - /url: "#/settings/locations"
    - link "First product · Complete":
      - /url: "#/inventory"
    - link "First stock · Complete":
      - /url: "#/inventory"
  - region "Business dashboard":
    - heading "Welcome back" [level=2]
    - paragraph: Harbor & Pine Home · Confirmed activity in UTC
    - text: Period
    - combobox "Overview period": Last 30 days
    - link "USD · Currency settings":
      - /url: "#/settings/preferences"
    - button "Refresh dashboard"
    - paragraph: Sales today
    - paragraph: $240.00
    - paragraph: +0.00% vs yesterday · gross sales
    - paragraph: Orders today
    - paragraph: "4"
    - paragraph: Confirmed sale transactions
    - paragraph: Average basket
    - paragraph: $60.00
    - paragraph: Today · rounded to the currency minor unit
    - link "Low stock 0 SKUs 4 out of stock · threshold 0":
      - /url: "#/inventory?stock=low-stock"
      - paragraph: Low stock
      - paragraph: 0 SKUs
      - paragraph: 4 out of stock · threshold 0
    - region "Inventory snapshot":
      - heading "Inventory snapshot" [level=3]
      - paragraph: Available units across your authorized warehouses.
      - link "Open inventory":
        - /url: "#/inventory"
      - region "Overview inventory snapshot":
        - table:
          - rowgroup:
            - row "Product SKU Available Status":
              - columnheader "Product"
              - columnheader "SKU"
              - columnheader "Available"
              - columnheader "Status"
          - rowgroup:
            - row "Oak dining chair · Natural 1 HP-001 0 EA Out of stock":
              - rowheader "Oak dining chair · Natural 1"
              - cell "HP-001"
              - cell "0 EA"
              - cell "Out of stock"
            - row "Linen lounge cushion · Slate 10 HP-010 0 EA Out of stock":
              - rowheader "Linen lounge cushion · Slate 10"
              - cell "HP-010"
              - cell "0 EA"
              - cell "Out of stock"
            - row "Ceramic serving bowl · Sand 19 HP-019 0 EA Out of stock":
              - rowheader "Ceramic serving bowl · Sand 19"
              - cell "HP-019"
              - cell "0 EA"
              - cell "Out of stock"
            - row "Adjustable desk lamp · Forest 28 HP-028 0 EA Out of stock":
              - rowheader "Adjustable desk lamp · Forest 28"
              - cell "HP-028"
              - cell "0 EA"
              - cell "Out of stock"
    - region "Quick POS":
      - heading "Quick POS" [level=3]
      - paragraph: Recent confirmed sales · USD
      - link "Open point of sale":
        - /url: "#/pos"
      - link "completed Linen lounge cushion · Natural 2 HP-002 · 1 line $60.00 2026-11-07 UTC":
        - /url: "#/sales"
        - text: completed
        - strong: Linen lounge cushion · Natural 2
        - text: HP-002 · 1 line $60.00
        - time: 2026-11-07 UTC
      - link "completed Linen lounge cushion · Natural 2 HP-002 · 1 line $60.00 2026-11-07 UTC":
        - /url: "#/sales"
        - text: completed
        - strong: Linen lounge cushion · Natural 2
        - text: HP-002 · 1 line $60.00
        - time: 2026-11-07 UTC
      - text: Period orders
      - strong: "28"
      - text: Gross sales
      - strong: $1680.00
    - region "Sales trend":
      - heading "Sales trend" [level=3]
      - paragraph: 2026-10-09 – 2026-11-07 UTC
      - strong: $1680.00
      - img "Daily gross sales in USD. Exact values are available in the accessible daily sales table."
      - text: 2026-10-09 2026-11-07
      - region "Daily sales values":
        - table:
          - rowgroup:
            - row "Date (UTC) Gross sales":
              - columnheader "Date (UTC)"
              - columnheader "Gross sales"
          - rowgroup:
            - row "2026-10-09 $0.00":
              - rowheader "2026-10-09"
              - cell "$0.00"
            - row "2026-10-10 $0.00":
              - rowheader "2026-10-10"
              - cell "$0.00"
            - row "2026-10-11 $0.00":
              - rowheader "2026-10-11"
              - cell "$0.00"
            - row "2026-10-12 $0.00":
              - rowheader "2026-10-12"
              - cell "$0.00"
            - row "2026-10-13 $0.00":
              - rowheader "2026-10-13"
              - cell "$0.00"
            - row "2026-10-14 $0.00":
              - rowheader "2026-10-14"
              - cell "$0.00"
            - row "2026-10-15 $0.00":
              - rowheader "2026-10-15"
              - cell "$0.00"
            - row "2026-10-16 $0.00":
              - rowheader "2026-10-16"
              - cell "$0.00"
            - row "2026-10-17 $0.00":
              - rowheader "2026-10-17"
              - cell "$0.00"
            - row "2026-10-18 $0.00":
              - rowheader "2026-10-18"
              - cell "$0.00"
            - row "2026-10-19 $0.00":
              - rowheader "2026-10-19"
              - cell "$0.00"
            - row "2026-10-20 $0.00":
              - rowheader "2026-10-20"
              - cell "$0.00"
            - row "2026-10-21 $0.00":
              - rowheader "2026-10-21"
              - cell "$0.00"
            - row "2026-10-22 $0.00":
              - rowheader "2026-10-22"
              - cell "$0.00"
            - row "2026-10-23 $0.00":
              - rowheader "2026-10-23"
              - cell "$0.00"
            - row "2026-10-24 $0.00":
              - rowheader "2026-10-24"
              - cell "$0.00"
            - row "2026-10-25 $0.00":
              - rowheader "2026-10-25"
              - cell "$0.00"
            - row "2026-10-26 $0.00":
              - rowheader "2026-10-26"
              - cell "$0.00"
            - row "2026-10-27 $0.00":
              - rowheader "2026-10-27"
              - cell "$0.00"
            - row "2026-10-28 $0.00":
              - rowheader "2026-10-28"
              - cell "$0.00"
            - row "2026-10-29 $0.00":
              - rowheader "2026-10-29"
              - cell "$0.00"
            - row "2026-10-30 $0.00":
              - rowheader "2026-10-30"
              - cell "$0.00"
            - row "2026-10-31 $0.00":
              - rowheader "2026-10-31"
              - cell "$0.00"
            - row "2026-11-01 $240.00":
              - rowheader "2026-11-01"
              - cell "$240.00"
            - row "2026-11-02 $240.00":
              - rowheader "2026-11-02"
              - cell "$240.00"
            - row "2026-11-03 $240.00":
              - rowheader "2026-11-03"
              - cell "$240.00"
            - row "2026-11-04 $240.00":
              - rowheader "2026-11-04"
              - cell "$240.00"
            - row "2026-11-05 $240.00":
              - rowheader "2026-11-05"
              - cell "$240.00"
            - row "2026-11-06 $240.00":
              - rowheader "2026-11-06"
              - cell "$240.00"
            - row "2026-11-07 $240.00":
              - rowheader "2026-11-07"
              - cell "$240.00"
    - region "Sales growth":
      - heading "Growth" [level=3]
      - paragraph: Against the previous 30 UTC days
      - paragraph: —
      - paragraph: No prior-period comparison
      - term: Current period
      - definition: $1680.00
      - term: Previous period
      - definition: $0.00
    - region "Top products":
      - heading "Top products" [level=3]
      - paragraph: By gross sales in this period
      - link "Open sales":
        - /url: "#/sales"
      - list:
        - listitem:
          - strong: Linen lounge cushion · Natural 2
          - text: HP-002
          - strong: $1680.00
    - paragraph: 2026-10-09 – 2026-11-07 UTC · USD only. Sales figures include tax and are before returns; they are not net profit. Stock covers your authorized warehouses. Updated 12:45:39 PM.
```

# Test source

```ts
  1  | import { expect, test } from '@playwright/test';
  2  | import { chooseSelect } from '../browser/select-control';
  3  | test('compact collections, POS details and role-safe menus work at narrow and desktop widths', async ({
  4  |   page,
  5  | }) => {
  6  |   const errors: string[] = [];
  7  |   page.on('pageerror', (e) => errors.push(e.message));
  8  |   await page.goto('/');
  9  |   await page.getByLabel('Account email').fill('owner@demo.example.test');
  10 |   await page.getByLabel('Password', { exact: true }).fill('local-demo');
  11 |   await page.getByRole('button', { name: 'Log in', exact: true }).click();
> 12 |   await expect(page.getByRole('heading', { name: 'Business setup shortcuts' })).toBeVisible();
     |                                                                                 ^ Error: expect(locator).toBeVisible() failed
  13 |   await page.evaluate(() => {
  14 |     location.hash = '/categories';
  15 |   });
  16 |   await expect(page.getByRole('combobox', { name: 'Search categories' })).toBeVisible();
  17 |   await page.getByRole('button', { name: /Add category/ }).click();
  18 |   await expect(page.getByRole('dialog').getByLabel('Category name')).toBeVisible();
  19 |   await page.getByRole('button', { name: 'Close Add category' }).click();
  20 |   await page.evaluate(() => {
  21 |     location.hash = '/pos';
  22 |   });
  23 |   await expect(page.getByRole('button', { name: 'Use cached products', exact: true })).toHaveCount(
  24 |     0,
  25 |   );
  26 |   const products = page.locator('.pos-products');
  27 |   await products.locator('.product-card-title').first().click();
  28 |   await expect(page.getByRole('dialog', { name: 'Product details' })).toBeVisible();
  29 |   await expect(page.getByRole('dialog').getByText('Selected unit', { exact: true })).toBeVisible();
  30 |   await page.getByRole('button', { name: 'Close Product details', exact: true }).click();
  31 |   for (const width of [390, 768, 1440]) {
  32 |     await page.setViewportSize({ width, height: 900 });
  33 |     expect(
  34 |       await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),
  35 |     ).toBeTruthy();
  36 |     await page.screenshot({
  37 |       path: `artifacts/qa/compact-workflows/pos-${width}.png`,
  38 |       animations: 'disabled',
  39 |     });
  40 |   }
  41 |   await chooseSelect(page, 'Role', 'cashier');
  42 |   await products
  43 |     .getByRole('button', { name: /^Actions for / })
  44 |     .first()
  45 |     .click();
  46 |   await expect(
  47 |     page.getByRole('menuitem', { name: 'Edit product / manage listing' }),
  48 |   ).toBeDisabled();
  49 |   await page.keyboard.press('Escape');
  50 |   expect(errors).toEqual([]);
  51 | });
  52 | 
```