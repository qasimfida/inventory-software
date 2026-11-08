# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: shell.spec.ts >> isolates auth, preserves sidebar viewport and profile, and traps search focus
- Location: tests/shell/shell.spec.ts:11:1

# Error details

```
Error: expect(page).toHaveURL(expected) failed

Expected pattern: /catalog\?search=HP-002/
Received string:  "http://127.0.0.1:5190/#/inventory?search=HP-002"
Timeout: 5000ms

Call log:
  - Expect "toHaveURL" with timeout 5000ms
    14 × locator resolved to <html lang="en" data-theme="dark" data-effects="false" data-states="simple" data-motion="enabled" data-accent="default" data-radius="rounded" data-charts="balanced" data-density="compact" data-text-size="medium" data-icon-size="medium" data-animation="minimal" data-control-size="medium">…</html>
       - unexpected value "http://127.0.0.1:5190/#/inventory?search=HP-002"

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
  - heading "Inventory" [level=1]
  - button "Workspace warehouse All permitted warehouses"
  - combobox "Search routes and records"
  - link "Online · server reachable":
    - /url: "#/settings/device"
  - button "Theme and colors"
  - button "Notifications, 3 unread in recent page": "3"
- main:
  - region "Inventory workspace":
    - group "Inventory section":
      - text: Inventory section
      - radio "Products & pricing" [checked]
      - text: Products & pricing
      - radio "Stock & movements"
      - text: Stock & movements
    - region "Product catalog":
      - heading "Products & pricing" [level=2]
      - paragraph: Manage products, categories and pricing across your business.
      - button "New product"
      - button "Bulk import"
      - button "Export shown products"
      - combobox "Search products": HP-002
      - button "Clear search"
      - button "Filters"
      - button "Refresh catalog"
      - tablist "Catalog":
        - tab "Catalog list view": List
        - tab "Catalog grid view" [selected]: Grid
      - tabpanel "Catalog grid view":
        - paragraph: 1 products
        - list:
          - listitem:
            - checkbox "Select Linen lounge cushion · Natural 2 for online store"
            - text: No image available
            - heading "View details for Linen lounge cushion · Natural 2" [level=3]:
              - button "View details for Linen lounge cushion · Natural 2": Linen lounge cushion · Natural 2
            - text: HP-002 active
            - paragraph: $30.00 / EA · base price
            - button "Actions for HP-002"
```

# Test source

```ts
  1   | import { chooseSelect } from '../browser/select-control';
  2   | import { test, expect } from '@playwright/test';
  3   | import type { Page } from '@playwright/test';
  4   | async function login(page: Page) {
  5   |   await page.goto('/');
  6   |   await page.getByLabel('Account email').fill('owner@demo.example.test');
  7   |   await page.getByLabel('Password', { exact: true }).fill('local-demo');
  8   |   await page.getByRole('button', { name: 'Log in', exact: true }).click();
  9   |   await expect(page).toHaveURL(/dashboard/);
  10  | }
  11  | test('isolates auth, preserves sidebar viewport and profile, and traps search focus', async ({
  12  |   page,
  13  | }) => {
  14  |   await page.setViewportSize({ width: 1440, height: 800 });
  15  |   await page.goto('/');
  16  |   await expect(page.getByRole('heading', { name: 'Sign in', exact: true })).toBeVisible();
  17  |   await expect(page.locator('.app-sidebar')).toHaveCount(0);
  18  |   await expect(page.getByText('Offline cash register', { exact: true })).toHaveCount(0);
  19  |   await login(page);
  20  |   await expect(page.getByRole('button', { name: 'Switch workspace', exact: true })).toHaveCount(0);
  21  |   const sidebar = page.locator('.desktop-sidebar .app-sidebar');
  22  |   expect((await sidebar.boundingBox())!.height).toBe(800);
  23  |   const nav = sidebar.locator('.sidebar-navigation'),
  24  |     profile = sidebar.locator('.sidebar-profile');
  25  |   const before = await profile.boundingBox();
  26  |   await nav.evaluate((e) => {
  27  |     e.scrollTop = e.scrollHeight;
  28  |   });
  29  |   expect((await profile.boundingBox())!.y).toBe(before!.y);
  30  |   await expect(profile).toBeInViewport();
  31  |   await page.getByRole('button', { name: 'Theme and colors' }).click();
  32  |   await page.getByRole('button', { name: 'Dark', exact: true }).click();
  33  |   await page.keyboard.press('Escape');
  34  |   await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  35  |   await page.keyboard.press('Control+k');
  36  |   await expect(page.getByRole('dialog')).toBeVisible();
  37  |   await page.getByRole('textbox', { name: 'Search workspace', exact: true }).fill('HP-002');
  38  |   await expect(page.getByRole('button', { name: /HP-002/ })).toBeVisible();
  39  |   await page.getByRole('button', { name: /HP-002/ }).click();
> 40  |   await expect(page).toHaveURL(/catalog\?search=HP-002/);
      |                      ^ Error: expect(page).toHaveURL(expected) failed
  41  |   await expect(page.getByLabel('Search products')).toHaveValue('HP-002');
  42  |   await page.keyboard.press('Control+k');
  43  |   await page.keyboard.press('Escape');
  44  |   await expect(page.getByRole('dialog')).toHaveCount(0);
  45  | });
  46  | test('hides unauthorized routes and rejects direct access after a role change', async ({
  47  |   page,
  48  | }) => {
  49  |   await login(page);
  50  |   await chooseSelect(page, 'Role', 'cashier');
  51  |   await page.evaluate(() => {
  52  |     location.hash = '/accounting';
  53  |   });
  54  |   await expect(page.getByRole('heading', { name: 'Access unavailable' })).toBeVisible();
  55  |   await expect(
  56  |     page.locator('.desktop-sidebar').getByRole('link', { name: 'Accounting', exact: true }),
  57  |   ).toHaveCount(0);
  58  |   await page.evaluate(() => {
  59  |     location.hash = '/dashboard';
  60  |   });
  61  |   await expect(page).toHaveURL(/pos/);
  62  |   await expect(page.locator('.app-header h1')).toHaveText('Point of sale');
  63  | });
  64  | test('mobile navigation keeps actions reachable and closes on route selection', async ({
  65  |   page,
  66  | }) => {
  67  |   await page.setViewportSize({ width: 390, height: 844 });
  68  |   await login(page);
  69  |   await page.getByLabel('Open navigation').click();
  70  |   await expect(page.getByRole('dialog')).toBeVisible();
  71  |   await page.getByRole('dialog').getByRole('link', { name: 'Inventory', exact: true }).click();
  72  |   await expect(page).toHaveURL(/inventory/);
  73  |   await expect(page.getByRole('dialog')).toHaveCount(0);
  74  |   expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
  75  | });
  76  | test('profile menu opens upward and demo failures recover without API traffic', async ({
  77  |   page,
  78  | }) => {
  79  |   const requests: string[] = [];
  80  |   page.on('request', (request) => {
  81  |     if (request.url().includes('/api/v1/')) requests.push(request.url());
  82  |   });
  83  |   await page.setViewportSize({ width: 1440, height: 800 });
  84  |   await login(page);
  85  |   const trigger = page.getByRole('button', { name: 'Open profile menu' });
  86  |   await trigger.click();
  87  |   const menu = page.getByRole('menu', { name: 'Profile menu' });
  88  |   await expect(menu).toBeVisible();
  89  |   expect((await menu.boundingBox())!.y).toBeLessThan((await trigger.boundingBox())!.y);
  90  |   await page.keyboard.press('Escape');
  91  |   await expect(menu).toHaveCount(0);
  92  |   await page.evaluate(() => {
  93  |     location.hash = '/catalog';
  94  |   });
  95  |   for (const scenario of ['error', 'offline']) {
  96  |     await chooseSelect(page, 'Scenario', scenario);
  97  |     await expect(page.locator('[role=alert]').first()).toBeVisible();
  98  |   }
  99  |   await chooseSelect(page, 'Scenario', 'normal');
  100 |   await expect(page.getByLabel('Search products')).toBeVisible();
  101 |   await expect(page.locator('[role=alert]')).toHaveCount(0);
  102 |   expect(requests).toEqual([]);
  103 | });
  104 | 
  105 | test('normal demo POS stays online without calling live readiness or business APIs', async ({
  106 |   page,
  107 | }) => {
  108 |   const requests: string[] = [];
  109 |   page.on('request', (request) => {
  110 |     if (request.url().includes('/api/v1/')) requests.push(request.url());
  111 |   });
  112 |   await login(page);
  113 |   await page.evaluate(() => {
  114 |     location.hash = '/pos';
  115 |   });
  116 |   await expect(page.getByRole('button', { name: /Add HP-002/ })).toBeVisible();
  117 |   await page.waitForTimeout(5500);
  118 |   await expect(page.getByRole('button', { name: /Add HP-002/ })).toBeVisible();
  119 |   await expect(page.getByText('Connection unavailable.', { exact: false })).toHaveCount(0);
  120 |   expect(requests).toEqual([]);
  121 | });
  122 | 
```