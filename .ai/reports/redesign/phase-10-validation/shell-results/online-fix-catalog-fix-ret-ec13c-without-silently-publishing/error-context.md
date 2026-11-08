# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: online-fix.spec.ts >> catalog fix returns to publication without silently publishing
- Location: tests/shell/online-fix.spec.ts:3:1

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByRole('dialog', { name: 'Product results' })
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" getByRole('dialog', { name: 'Product results' }) with timeout 5000ms
  - waiting for getByRole('dialog', { name: 'Product results' })

```

```yaml
- dialog "Edit product":
  - separator "Resize drawer"
  - heading "Edit product" [level=2]
  - button "Close Edit product"
  - paragraph: Review the details before saving.
  - paragraph: Details → selling price → quantity. Save each step; advanced options are optional.
  - group "Product setup":
    - text: Product setup
    - radio "Details" [checked]
    - text: Details
    - radio "Price & units"
    - text: Price & units
    - radio "Quantity"
    - text: Quantity
    - radio "Listing availability"
    - text: Listing availability
  - status: Product details saved. Price and stock changes are saved separately below.
  - heading "Edit product" [level=3]
  - heading "Product basics" [level=3]:
    - button "Product basics" [expanded]
  - region "Product basics":
    - text: Product name
    - textbox "Product name": Repaired online product
    - text: SKU
    - textbox "SKU": HP-001
    - button "SKU ID is available."
    - status: SKU is available.
    - text: Description
    - toolbar "Description formatting":
      - button "Bold":
        - img
      - button "Italic":
        - img
      - button "Underline":
        - img
      - button "Numbered list":
        - img
      - button "Bulleted list":
        - img
      - button "Insert link":
        - img
      - button "Clear formatting":
        - img
    - textbox "Description":
      - paragraph: Durable everyday essentials, responsibly sourced for busy homes and workspaces.
    - paragraph: 79/2000 characters including formatting
  - heading "Images and product codes" [level=3]:
    - button "Images and product codes" [expanded]
  - region "Images and product codes":
    - text: Image HTTPS URLs (one per line)
    - textbox "Image HTTPS URLs (one per line)": https://images.example.com/demo/product-1.png
    - text: Barcodes (one per line)
    - textbox "Barcodes (one per line)": "8900000000001"
    - text: Alternative codes (one per line)
    - textbox "Alternative codes (one per line)"
  - heading "Category and inventory settings" [level=3]:
    - button "Category and inventory settings" [expanded]
  - region "Category and inventory settings":
    - text: Category
    - combobox "Category": Living
    - text: Product type
    - combobox "Product type": physical
    - text: Track inventory
    - combobox "Track inventory": "Yes"
    - text: Product status
    - combobox "Product status": active
    - paragraph: Archiving is permanent. Use the Quantity step to record opening stock or an adjustment.
  - paragraph: Save details, then continue to Price & units and Quantity. Each step confirms its own changes.
  - button "Save product"
  - button "Cancel product edit"
  - button "Done"
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | import { chooseSelect } from '../browser/select-control';
  3  | test('catalog fix returns to publication without silently publishing', async ({ page }) => {
  4  |   await page.goto('/');
  5  |   await page.getByLabel('Account email').fill('owner@demo.example.test');
  6  |   await page.getByLabel('Password', { exact: true }).fill('local-demo');
  7  |   await page.getByRole('button', { name: 'Log in', exact: true }).click();
  8  |   await chooseSelect(page, 'Scenario', 'store-live');
  9  |   await page.evaluate(() => {
  10 |     location.hash = '/online-store/products?tab=changes-required';
  11 |   });
  12 |   await page
  13 |     .getByRole('button', { name: /errors, .*warnings/ })
  14 |     .first()
  15 |     .hover();
  16 |   await page.getByRole('button', { name: 'Fix title', exact: true }).first().click();
  17 |   await expect(page.getByRole('textbox', { name: 'Product name', exact: true })).toBeFocused();
  18 |   await page
  19 |     .getByRole('textbox', { name: 'Product name', exact: true })
  20 |     .fill('Repaired online product');
  21 |   await page.getByRole('button', { name: 'Save product', exact: true }).click();
> 22 |   await expect(page.getByRole('dialog', { name: 'Product results' })).toBeVisible();
     |                                                                       ^ Error: expect(locator).toBeVisible() failed
  23 |   await page.getByRole('button', { name: 'Close Product results', exact: true }).click();
  24 |   await page.getByRole('tab', { name: /Ready to publish/ }).click();
  25 |   const row = page
  26 |     .getByRole('row')
  27 |     .filter({ has: page.getByRole('button', { name: 'Repaired online product', exact: true }) });
  28 |   await expect(row).toBeVisible();
  29 |   await row.getByRole('button', { name: 'Publish', exact: true }).click();
  30 |   await expect(page.getByRole('dialog')).toContainText('Published and confirmed by the server.');
  31 |   await page.getByRole('button', { name: 'Close Product results', exact: true }).click();
  32 |   await page.getByRole('tab', { name: /Active/ }).click();
  33 |   await expect(row).toBeVisible();
  34 |   await row.getByRole('button', { name: 'Pause', exact: true }).click();
  35 |   await expect(page.getByRole('dialog')).toContainText('Paused and hidden from sale.');
  36 | });
  37 | 
```