# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: workflow-refinement.spec.ts >> owner collection actions, setup links and responsive POS retain their workflows
- Location: tests/shell/workflow-refinement.spec.ts:4:1

# Error details

```
Error: expect(locator).toHaveValue(expected) failed

Locator:  getByLabel('Quantity 1', { exact: true })
Expected: "4"
Received: "2"
Timeout:  5000ms

Call log:
  - Expect "toHaveValue" getByLabel('Quantity 1', { exact: true }) with timeout 5000ms
  - waiting for getByLabel('Quantity 1', { exact: true })
    14 × locator resolved to <input value="2" id="pos-qty-0" data-slot="input" inputmode="decimal" class="w-full min-w-0 min-h-(--control-height) rounded-md border border-input bg-card px-3 py-1.5 text-control text-foreground placeholder:text-muted-foreground [&[readonly]]:bg-muted [&[readonly]]:cursor-default disabled:cursor-not-allowed disabled:bg-disabled disabled:text-disabled-foreground aria-invalid:border-destructive"/>
       - unexpected value "2"

```

```yaml
- textbox "Quantity 1": "2"
```

# Test source

```ts
  1   | import { expect, test } from '@playwright/test';
  2   | import { chooseSelect } from '../browser/select-control';
  3   | 
  4   | test('owner collection actions, setup links and responsive POS retain their workflows', async ({
  5   |   page,
  6   | }) => {
  7   |   const errors: string[] = [];
  8   |   page.on('pageerror', (error) => errors.push(error.message));
  9   |   await page.goto('/');
  10  |   await page.getByLabel('Account email').fill('owner@demo.example.test');
  11  |   await page.getByLabel('Password', { exact: true }).fill('local-demo');
  12  |   await page.getByRole('button', { name: 'Log in', exact: true }).click();
  13  |   const setup = page.getByRole('navigation', { name: 'Business setup' });
  14  |   await expect(setup.getByRole('link')).toHaveCount(6);
  15  |   await expect(setup.getByRole('button')).toHaveCount(0);
  16  |   await page.evaluate(() => {
  17  |     location.hash = '/customers';
  18  |   });
  19  |   await expect(page.getByRole('button', { name: 'Add customer', exact: true })).toBeVisible();
  20  |   await expect(page.getByText('Customer privacy and retention', { exact: true })).toHaveCount(0);
  21  |   await page.evaluate(() => {
  22  |     location.hash = '/team';
  23  |   });
  24  |   await expect(
  25  |     page.getByRole('combobox', { name: 'Search team members', exact: true }),
  26  |   ).toBeVisible();
  27  |   await expect(
  28  |     page.getByRole('heading', { name: 'Staff and salaries', exact: true }),
  29  |   ).toBeVisible();
  30  |   await page.getByRole('button', { name: 'Assign member', exact: true }).click();
  31  |   await expect(page.getByRole('dialog').getByLabel('Member email')).toBeVisible();
  32  |   await page.getByRole('button', { name: 'Close Assign member', exact: true }).click();
  33  |   await page.evaluate(() => {
  34  |     location.hash = '/staff';
  35  |   });
  36  |   await expect(page.getByRole('heading', { name: 'Expenses', exact: true })).toBeVisible();
  37  |   await expect(page.getByRole('heading', { name: 'Staff and salaries', exact: true })).toHaveCount(
  38  |     0,
  39  |   );
  40  |   await page.evaluate(() => {
  41  |     location.hash = '/pos';
  42  |   });
  43  |   await page
  44  |     .getByRole('button', { name: /^Add HP-/ })
  45  |     .first()
  46  |     .click();
  47  |   await expect(page.getByRole('button', { name: 'Checkout', exact: true })).toBeEnabled();
  48  |   await page
  49  |     .getByRole('button', { name: 'Increase Quantity 1', exact: true })
  50  |     .click({ clickCount: 3 });
> 51  |   await expect(page.getByLabel('Quantity 1', { exact: true })).toHaveValue('4');
      |                                                                ^ Error: expect(locator).toHaveValue(expected) failed
  52  |   await expect(page.getByRole('button', { name: 'Checkout', exact: true })).toBeEnabled();
  53  |   await expect(page.getByRole('button', { name: 'Remove line 2', exact: true })).toHaveCount(0);
  54  |   for (const width of [390, 768, 1440]) {
  55  |     await page.setViewportSize({ width, height: 900 });
  56  |     expect(
  57  |       await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),
  58  |     ).toBeTruthy();
  59  |     await page.screenshot({
  60  |       path: `artifacts/qa/workflow-refinement/pos-${width}.png`,
  61  |       animations: 'disabled',
  62  |       timeout: 10000,
  63  |     });
  64  |   }
  65  |   await page.getByRole('button', { name: 'Remove line 1', exact: true }).click();
  66  |   await page
  67  |     .locator('.pos-products')
  68  |     .getByRole('button', { name: /^Actions for / })
  69  |     .first()
  70  |     .click();
  71  |   await page.getByRole('menuitem', { name: 'Edit product / manage listing', exact: true }).click();
  72  |   await expect(
  73  |     page.getByRole('dialog').getByRole('button', { name: 'Deactivate product', exact: true }),
  74  |   ).toBeVisible();
  75  |   await page
  76  |     .getByRole('dialog')
  77  |     .getByRole('button', { name: /^Close / })
  78  |     .click();
  79  |   await chooseSelect(page, 'Role', 'cashier');
  80  |   await expect(page.getByRole('button', { name: 'Manage listing', exact: true })).toHaveCount(0);
  81  |   await expect(
  82  |     page.getByRole('link', { name: 'Add or activate products in catalog', exact: true }),
  83  |   ).toHaveCount(0);
  84  |   expect(errors).toEqual([]);
  85  | });
  86  | 
  87  | test('purchasing filters and dedicated online setup steps use the shared responsive layout', async ({
  88  |   page,
  89  | }) => {
  90  |   await page.goto('/');
  91  |   await page.getByLabel('Account email').fill('owner@demo.example.test');
  92  |   await page.getByLabel('Password', { exact: true }).fill('local-demo');
  93  |   await page.getByRole('button', { name: 'Log in', exact: true }).click();
  94  |   await expect(page).toHaveURL(/dashboard/);
  95  |   await page.evaluate(() => {
  96  |     location.hash = '/purchasing';
  97  |   });
  98  |   await page.getByRole('button', { name: 'Purchasing filters', exact: true }).click();
  99  |   await expect(page.getByRole('combobox', { name: 'Supplier history', exact: true })).toBeVisible();
  100 |   await page.keyboard.press('Escape');
  101 |   await chooseSelect(page, 'Scenario', 'empty');
  102 |   await page.evaluate(() => {
  103 |     location.hash = '/online-store';
  104 |   });
  105 |   const setup = page.getByRole('region', { name: 'Complete your online store', exact: true });
  106 |   await expect(setup).toBeVisible();
  107 |   await expect(setup.getByRole('link', { name: 'Set up online store', exact: true })).toBeVisible();
  108 |   await expect(setup).not.toContainText('0 of 0 steps');
  109 |   await page.setViewportSize({ width: 390, height: 844 });
  110 |   expect(
  111 |     await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),
  112 |   ).toBeTruthy();
  113 |   await setup.screenshot({
  114 |     path: 'artifacts/qa/workflow-refinement/online-setup-390.png',
  115 |     animations: 'disabled',
  116 |     timeout: 10000,
  117 |   });
  118 | });
  119 | 
```