# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: pos-availability.spec.ts >> sold-out product cannot be added from POS card, search or details
- Location: tests/shell/pos-availability.spec.ts:2:1

# Error details

```
Test timeout of 90000ms exceeded.
```

```
Error: locator.click: Test timeout of 90000ms exceeded.
Call log:
  - waiting for getByRole('button', { name: 'New product', exact: true })

```

# Page snapshot

```yaml
- generic [ref=e2]:
  - complementary "Demonstration controls" [ref=e3]:
    - strong [ref=e4]: Demo · local data
    - generic [ref=e5]:
      - text: Role
      - combobox [aria-hidden] [ref=e6] [cursor=pointer]
      - combobox "Role" [ref=e7] [cursor=pointer]:
        - generic: owner
    - generic [ref=e11]:
      - text: Scenario
      - combobox [aria-hidden] [ref=e12] [cursor=pointer]
      - combobox "Scenario" [ref=e13] [cursor=pointer]:
        - generic [ref=e14]: normal
    - generic [ref=e18]: No live requests. Transaction actions require a live test API.
  - generic [ref=e19]:
    - link "Skip to page content" [ref=e20] [cursor=pointer]:
      - /url: "#page-content"
    - generic [ref=e21]:
      - complementary "Application sidebar" [ref=e22]:
        - button "Switch workspace" [ref=e24] [cursor=pointer]:
          - generic [ref=e26]:
            - generic [aria-hidden] [ref=e27]: HA
            - generic [ref=e28]:
              - generic [ref=e29]: Harbor & Pine Home
              - generic [ref=e30]: owner · All authorized locations
        - navigation "Main navigation" [ref=e31]:
          - link "Online store" [ref=e33] [cursor=pointer]:
            - /url: "#/online-store"
          - link "Overview" [ref=e46] [cursor=pointer]:
            - /url: "#/dashboard"
          - generic [ref=e52]:
            - heading [level=3] [ref=e53]:
              - button "Sales" [expanded] [ref=e54] [cursor=pointer]
            - region "Sales" [ref=e58]:
              - link "Point of sale" [ref=e59] [cursor=pointer]:
                - /url: "#/pos"
              - link "Sales & receipts" [ref=e66] [cursor=pointer]:
                - /url: "#/sales"
              - link "Cash shifts" [ref=e71] [cursor=pointer]:
                - /url: "#/cash"
          - generic [ref=e77]:
            - heading [level=3] [ref=e78]:
              - button "Inventory" [expanded] [ref=e79] [cursor=pointer]
            - region "Inventory" [ref=e83]:
              - link "Categories" [ref=e84] [cursor=pointer]:
                - /url: "#/categories"
              - link "Inventory" [ref=e96] [cursor=pointer]:
                - /url: "#/inventory"
              - link "Stock counts & scanning" [ref=e108] [cursor=pointer]:
                - /url: "#/warehouse"
              - link "Transfers" [ref=e115] [cursor=pointer]:
                - /url: "#/transfers"
              - link "Warehouse & storage" [ref=e120] [cursor=pointer]:
                - /url: "#/storage"
          - link "Purchasing & suppliers" [ref=e126] [cursor=pointer]:
            - /url: "#/purchasing"
          - link "Customers" [ref=e134] [cursor=pointer]:
            - /url: "#/customers"
          - generic [ref=e142]:
            - heading [level=3] [ref=e143]:
              - button "Finance" [expanded] [ref=e144] [cursor=pointer]
            - region "Finance" [ref=e148]:
              - link "Supplier balances" [ref=e149] [cursor=pointer]:
                - /url: "#/payables"
              - link "Accounting" [ref=e154] [cursor=pointer]:
                - /url: "#/accounting"
          - link "Reports" [ref=e159] [cursor=pointer]:
            - /url: "#/reports"
          - generic [ref=e164]:
            - heading [level=3] [ref=e165]:
              - button "Administration" [expanded] [ref=e166] [cursor=pointer]
            - region "Administration" [ref=e170]:
              - link "Logs" [ref=e171] [cursor=pointer]:
                - /url: "#/logs"
              - link "Notifications & approvals" [ref=e176] [cursor=pointer]:
                - /url: "#/notifications"
              - link "Business trading" [ref=e181] [cursor=pointer]:
                - /url: "#/trading"
              - link "Integrations & help" [ref=e188] [cursor=pointer]:
                - /url: "#/integrations"
              - link "Expenses" [ref=e192] [cursor=pointer]:
                - /url: "#/staff"
              - link "Team & permissions" [ref=e199] [cursor=pointer]:
                - /url: "#/team"
          - generic [ref=e205]:
            - heading [level=3] [ref=e206]:
              - button "Settings" [expanded] [ref=e207] [cursor=pointer]
            - region "Settings" [ref=e211]:
              - link "Profile" [ref=e212] [cursor=pointer]:
                - /url: "#/settings/profile"
              - link "Company profile" [ref=e217] [cursor=pointer]:
                - /url: "#/settings/company"
              - link "Business" [ref=e223] [cursor=pointer]:
                - /url: "#/settings/business"
              - link "Preferences" [ref=e229] [cursor=pointer]:
                - /url: "#/settings/preferences"
              - link "Security" [ref=e237] [cursor=pointer]:
                - /url: "#/settings/security"
              - link "Device & Offline" [ref=e241] [cursor=pointer]:
                - /url: "#/settings/device"
              - link "Security notifications" [ref=e245] [cursor=pointer]:
                - /url: "#/settings/notifications"
              - link "Stores & terminals" [ref=e250] [cursor=pointer]:
                - /url: "#/settings/locations"
              - link "Audit history" [ref=e255] [cursor=pointer]:
                - /url: "#/settings/audit"
        - button "Open profile menu" [ref=e262] [cursor=pointer]:
          - generic [ref=e264]:
            - generic [aria-hidden] [ref=e265]: OW
            - generic [ref=e266]:
              - generic [ref=e267]: owner
              - generic [ref=e268]: owner
      - separator "Resize sidebar" [ref=e269]
    - button "Collapse sidebar" [expanded] [ref=e270] [cursor=pointer]
    - generic [ref=e272]:
      - banner [ref=e273]:
        - generic [ref=e274]:
          - heading "Overview" [level=1] [ref=e275]
          - button "Workspace warehouse All permitted warehouses" [ref=e276] [cursor=pointer]:
            - generic [ref=e277]:
              - generic [ref=e278]: Workspace warehouse
              - generic [ref=e279]: All permitted warehouses
        - generic [ref=e280]:
          - combobox "Search routes and records" [ref=e284]
          - link "Online · server reachable" [ref=e286] [cursor=pointer]:
            - /url: "#/settings/device"
          - button "Theme and colors" [ref=e293] [cursor=pointer]
          - button "Notifications, 3 unread in recent page" [ref=e296] [cursor=pointer]:
            - generic [ref=e297]: "3"
      - main [active] [ref=e298]:
        - generic [ref=e299]:
          - navigation "Business setup" [ref=e300]:
            - generic [ref=e301]:
              - heading "Business setup" [level=3] [ref=e302]
              - generic [ref=e303]: 6 of 6 complete
            - paragraph [ref=e304]: Manage the company, locations and catalog used by this workspace.
            - generic [ref=e305]:
              - link "Business profile · Complete" [ref=e306] [cursor=pointer]:
                - /url: "#/settings/company"
                - text: Business profile
                - generic [ref=e307]: · Complete
              - link "Transaction currency · Complete" [ref=e308] [cursor=pointer]:
                - /url: "#/settings/company"
                - text: Transaction currency
                - generic [ref=e309]: · Complete
              - link "Tax defaults · Complete" [ref=e310] [cursor=pointer]:
                - /url: "#/settings/company"
                - text: Tax defaults
                - generic [ref=e311]: · Complete
              - link "Stores and warehouses · Complete" [ref=e312] [cursor=pointer]:
                - /url: "#/settings/locations"
                - text: Stores and warehouses
                - generic [ref=e313]: · Complete
              - link "First product · Complete" [ref=e314] [cursor=pointer]:
                - /url: "#/inventory"
                - text: First product
                - generic [ref=e315]: · Complete
              - link "First stock · Complete" [ref=e316] [cursor=pointer]:
                - /url: "#/inventory"
                - text: First stock
                - generic [ref=e317]: · Complete
          - region "Business dashboard" [ref=e318]:
            - generic [ref=e319]:
              - generic [ref=e320]:
                - heading "Welcome back" [level=2] [ref=e321]
                - paragraph [ref=e322]: Harbor & Pine Home · Confirmed activity in UTC
              - generic [ref=e323]:
                - generic [ref=e324]:
                  - text: Period
                  - combobox [aria-hidden] [ref=e325] [cursor=pointer]
                  - combobox "Overview period" [ref=e326] [cursor=pointer]:
                    - generic: Last 30 days
                - link "USD · Currency settings" [ref=e330] [cursor=pointer]:
                  - /url: "#/settings/preferences"
                  - text: USD
                  - generic [ref=e334]: · Currency settings
                - button "Refresh dashboard" [ref=e335] [cursor=pointer]
            - generic [ref=e337]:
              - generic [ref=e342]:
                - paragraph [ref=e343]: Sales today
                - paragraph [ref=e344]: $240.00
                - paragraph [ref=e345]: +0.00% vs yesterday · gross sales
              - generic [ref=e350]:
                - paragraph [ref=e351]: Orders today
                - paragraph [ref=e352]: "4"
                - paragraph [ref=e353]: Confirmed sale transactions
              - generic [ref=e360]:
                - paragraph [ref=e361]: Average basket
                - paragraph [ref=e362]: $60.00
                - paragraph [ref=e363]: Today · rounded to the currency minor unit
              - link [ref=e364] [cursor=pointer]:
                - /url: "#/inventory?stock=low-stock"
                - generic [ref=e369]:
                  - paragraph [ref=e370]: Low stock
                  - paragraph [ref=e371]: 0 SKUs
                  - paragraph [ref=e372]: 4 out of stock · threshold 0
            - generic [ref=e373]:
              - region "Inventory snapshot" [ref=e374]:
                - generic [ref=e375]:
                  - generic [ref=e376]:
                    - heading "Inventory snapshot" [level=3] [ref=e377]
                    - paragraph [ref=e378]: Available units across your authorized warehouses.
                  - link "Open inventory" [ref=e379] [cursor=pointer]:
                    - /url: "#/inventory"
                - region "Overview inventory snapshot" [ref=e383]:
                  - table [ref=e384]:
                    - rowgroup [ref=e385]:
                      - row [ref=e386]:
                        - columnheader "Product" [ref=e387]
                        - columnheader "SKU" [ref=e388]
                        - columnheader "Available" [ref=e389]
                        - columnheader "Status" [ref=e390]
                    - rowgroup [ref=e391]:
                      - row [ref=e392]:
                        - rowheader "Oak dining chair · Natural 1" [ref=e393]
                        - cell "HP-001" [ref=e399]
                        - cell "0 EA" [ref=e400]
                        - cell "Out of stock" [ref=e401]
                      - row [ref=e403]:
                        - rowheader "Linen lounge cushion · Slate 10" [ref=e404]
                        - cell "HP-010" [ref=e410]
                        - cell "0 EA" [ref=e411]
                        - cell "Out of stock" [ref=e412]
                      - row [ref=e414]:
                        - rowheader "Ceramic serving bowl · Sand 19" [ref=e415]
                        - cell "HP-019" [ref=e421]
                        - cell "0 EA" [ref=e422]
                        - cell "Out of stock" [ref=e423]
                      - row [ref=e425]:
                        - rowheader "Adjustable desk lamp · Forest 28" [ref=e426]
                        - cell "HP-028" [ref=e432]
                        - cell "0 EA" [ref=e433]
                        - cell "Out of stock" [ref=e434]
              - region "Quick POS" [ref=e436]:
                - generic [ref=e437]:
                  - generic [ref=e438]:
                    - heading "Quick POS" [level=3] [ref=e439]
                    - paragraph [ref=e440]: Recent confirmed sales · USD
                  - link "Open point of sale" [ref=e441] [cursor=pointer]:
                    - /url: "#/pos"
                - generic [ref=e443]:
                  - link "completed Linen lounge cushion · Natural 2 HP-002 · 1 line $60.00 2026-11-07 UTC" [ref=e444] [cursor=pointer]:
                    - /url: "#/sales"
                    - generic [ref=e445]: completed
                    - strong [ref=e451]: Linen lounge cushion · Natural 2
                    - generic [ref=e452]: HP-002 · 1 line
                    - generic [ref=e453]: $60.00
                    - time [ref=e454]: 2026-11-07 UTC
                  - link "completed Linen lounge cushion · Natural 2 HP-002 · 1 line $60.00 2026-11-07 UTC" [ref=e455] [cursor=pointer]:
                    - /url: "#/sales"
                    - generic [ref=e456]: completed
                    - strong [ref=e462]: Linen lounge cushion · Natural 2
                    - generic [ref=e463]: HP-002 · 1 line
                    - generic [ref=e464]: $60.00
                    - time [ref=e465]: 2026-11-07 UTC
                - generic [ref=e466]:
                  - generic [ref=e467]:
                    - generic [ref=e468]: Period orders
                    - strong [ref=e469]: "28"
                  - generic [ref=e470]:
                    - generic [ref=e471]: Gross sales
                    - strong [ref=e472]: $1680.00
              - region "Sales trend" [ref=e473]:
                - generic [ref=e474]:
                  - generic [ref=e475]:
                    - heading "Sales trend" [level=3] [ref=e476]
                    - paragraph [ref=e477]: 2026-10-09 – 2026-11-07 UTC
                  - strong [ref=e478]: $1680.00
                - generic [ref=e479]:
                  - img "Daily gross sales in USD. Exact values are available in the accessible daily sales table." [ref=e480]:
                    - 'generic "2026-10-09: $0.00 gross sales" [ref=e483]'
                    - 'generic "2026-10-10: $0.00 gross sales" [ref=e484]'
                    - 'generic "2026-10-11: $0.00 gross sales" [ref=e485]'
                    - 'generic "2026-10-12: $0.00 gross sales" [ref=e486]'
                    - 'generic "2026-10-13: $0.00 gross sales" [ref=e487]'
                    - 'generic "2026-10-14: $0.00 gross sales" [ref=e488]'
                    - 'generic "2026-10-15: $0.00 gross sales" [ref=e489]'
                    - 'generic "2026-10-16: $0.00 gross sales" [ref=e490]'
                    - 'generic "2026-10-17: $0.00 gross sales" [ref=e491]'
                    - 'generic "2026-10-18: $0.00 gross sales" [ref=e492]'
                    - 'generic "2026-10-19: $0.00 gross sales" [ref=e493]'
                    - 'generic "2026-10-20: $0.00 gross sales" [ref=e494]'
                    - 'generic "2026-10-21: $0.00 gross sales" [ref=e495]'
                    - 'generic "2026-10-22: $0.00 gross sales" [ref=e496]'
                    - 'generic "2026-10-23: $0.00 gross sales" [ref=e497]'
                    - 'generic "2026-10-24: $0.00 gross sales" [ref=e498]'
                    - 'generic "2026-10-25: $0.00 gross sales" [ref=e499]'
                    - 'generic "2026-10-26: $0.00 gross sales" [ref=e500]'
                    - 'generic "2026-10-27: $0.00 gross sales" [ref=e501]'
                    - 'generic "2026-10-28: $0.00 gross sales" [ref=e502]'
                    - 'generic "2026-10-29: $0.00 gross sales" [ref=e503]'
                    - 'generic "2026-10-30: $0.00 gross sales" [ref=e504]'
                    - 'generic "2026-10-31: $0.00 gross sales" [ref=e505]'
                    - 'generic "2026-11-01: $240.00 gross sales" [ref=e506]'
                    - 'generic "2026-11-02: $240.00 gross sales" [ref=e507]'
                    - 'generic "2026-11-03: $240.00 gross sales" [ref=e508]'
                    - 'generic "2026-11-04: $240.00 gross sales" [ref=e509]'
                    - 'generic "2026-11-05: $240.00 gross sales" [ref=e510]'
                    - 'generic "2026-11-06: $240.00 gross sales" [ref=e511]'
                    - 'generic "2026-11-07: $240.00 gross sales" [ref=e512]'
                  - generic [ref=e513]:
                    - generic [ref=e514]: 2026-10-09
                    - generic [ref=e515]: 2026-11-07
                  - generic "Sales chart values" [ref=e516]:
                    - region "Daily sales values" [ref=e517]:
                      - table [ref=e518]:
                        - rowgroup [ref=e519]:
                          - row [ref=e520]:
                            - columnheader "Date (UTC)" [ref=e521]
                            - columnheader "Gross sales" [ref=e522]
                        - rowgroup [ref=e523]:
                          - row [ref=e524]:
                            - rowheader "2026-10-09" [ref=e525]
                            - cell "$0.00" [ref=e526]
                          - row [ref=e527]:
                            - rowheader "2026-10-10" [ref=e528]
                            - cell "$0.00" [ref=e529]
                          - row [ref=e530]:
                            - rowheader "2026-10-11" [ref=e531]
                            - cell "$0.00" [ref=e532]
                          - row [ref=e533]:
                            - rowheader "2026-10-12" [ref=e534]
                            - cell "$0.00" [ref=e535]
                          - row [ref=e536]:
                            - rowheader "2026-10-13" [ref=e537]
                            - cell "$0.00" [ref=e538]
                          - row [ref=e539]:
                            - rowheader "2026-10-14" [ref=e540]
                            - cell "$0.00" [ref=e541]
                          - row [ref=e542]:
                            - rowheader "2026-10-15" [ref=e543]
                            - cell "$0.00" [ref=e544]
                          - row [ref=e545]:
                            - rowheader "2026-10-16" [ref=e546]
                            - cell "$0.00" [ref=e547]
                          - row [ref=e548]:
                            - rowheader "2026-10-17" [ref=e549]
                            - cell "$0.00" [ref=e550]
                          - row [ref=e551]:
                            - rowheader "2026-10-18" [ref=e552]
                            - cell "$0.00" [ref=e553]
                          - row [ref=e554]:
                            - rowheader "2026-10-19" [ref=e555]
                            - cell "$0.00" [ref=e556]
                          - row [ref=e557]:
                            - rowheader "2026-10-20" [ref=e558]
                            - cell "$0.00" [ref=e559]
                          - row [ref=e560]:
                            - rowheader "2026-10-21" [ref=e561]
                            - cell "$0.00" [ref=e562]
                          - row [ref=e563]:
                            - rowheader "2026-10-22" [ref=e564]
                            - cell "$0.00" [ref=e565]
                          - row [ref=e566]:
                            - rowheader "2026-10-23" [ref=e567]
                            - cell "$0.00" [ref=e568]
                          - row [ref=e569]:
                            - rowheader "2026-10-24" [ref=e570]
                            - cell "$0.00" [ref=e571]
                          - row [ref=e572]:
                            - rowheader "2026-10-25" [ref=e573]
                            - cell "$0.00" [ref=e574]
                          - row [ref=e575]:
                            - rowheader "2026-10-26" [ref=e576]
                            - cell "$0.00" [ref=e577]
                          - row [ref=e578]:
                            - rowheader "2026-10-27" [ref=e579]
                            - cell "$0.00" [ref=e580]
                          - row [ref=e581]:
                            - rowheader "2026-10-28" [ref=e582]
                            - cell "$0.00" [ref=e583]
                          - row [ref=e584]:
                            - rowheader "2026-10-29" [ref=e585]
                            - cell "$0.00" [ref=e586]
                          - row [ref=e587]:
                            - rowheader "2026-10-30" [ref=e588]
                            - cell "$0.00" [ref=e589]
                          - row [ref=e590]:
                            - rowheader "2026-10-31" [ref=e591]
                            - cell "$0.00" [ref=e592]
                          - row [ref=e593]:
                            - rowheader "2026-11-01" [ref=e594]
                            - cell "$240.00" [ref=e595]
                          - row [ref=e596]:
                            - rowheader "2026-11-02" [ref=e597]
                            - cell "$240.00" [ref=e598]
                          - row [ref=e599]:
                            - rowheader "2026-11-03" [ref=e600]
                            - cell "$240.00" [ref=e601]
                          - row [ref=e602]:
                            - rowheader "2026-11-04" [ref=e603]
                            - cell "$240.00" [ref=e604]
                          - row [ref=e605]:
                            - rowheader "2026-11-05" [ref=e606]
                            - cell "$240.00" [ref=e607]
                          - row [ref=e608]:
                            - rowheader "2026-11-06" [ref=e609]
                            - cell "$240.00" [ref=e610]
                          - row [ref=e611]:
                            - rowheader "2026-11-07" [ref=e612]
                            - cell "$240.00" [ref=e613]
              - region "Sales growth" [ref=e614]:
                - generic [ref=e616]:
                  - heading "Growth" [level=3] [ref=e617]
                  - paragraph [ref=e618]: Against the previous 30 UTC days
                - paragraph [ref=e622]: —
                - paragraph [ref=e623]: No prior-period comparison
                - generic [ref=e624]:
                  - term [ref=e625]: Current period
                  - definition [ref=e626]: $1680.00
                  - term [ref=e627]: Previous period
                  - definition [ref=e628]: $0.00
              - region "Top products" [ref=e629]:
                - generic [ref=e630]:
                  - generic [ref=e631]:
                    - heading "Top products" [level=3] [ref=e632]
                    - paragraph [ref=e633]: By gross sales in this period
                  - link "Open sales" [ref=e634] [cursor=pointer]:
                    - /url: "#/sales"
                - list [ref=e638]:
                  - listitem [ref=e639]:
                    - generic [ref=e644]:
                      - strong [ref=e645]: Linen lounge cushion · Natural 2
                      - generic [ref=e646]: HP-002
                    - strong [ref=e647]: $1680.00
            - paragraph [ref=e648]: 2026-10-09 – 2026-11-07 UTC · USD only. Sales figures include tax and are before returns; they are not net profit. Stock covers your authorized warehouses. Updated 12:48:49 PM.
```

# Test source

```ts
  1  | import { expect, test } from '@playwright/test';
  2  | test('sold-out product cannot be added from POS card, search or details', async ({ page }) => {
  3  |   await page.goto('/');
  4  |   await page.getByLabel('Account email').fill('owner@demo.example.test');
  5  |   await page.getByLabel('Password', { exact: true }).fill('local-demo');
  6  |   await page.getByRole('button', { name: 'Log in', exact: true }).click();
  7  |   await page.evaluate(() => {
  8  |     location.hash = '/inventory';
  9  |   });
> 10 |   await page.getByRole('button', { name: 'New product', exact: true }).click();
     |                                                                        ^ Error: locator.click: Test timeout of 90000ms exceeded.
  11 |   await page.getByLabel('Product name', { exact: true }).fill('Sold out test');
  12 |   await page.getByLabel('SKU', { exact: true }).fill('SOLD-TEST');
  13 |   await page.getByRole('button', { name: 'Save details & continue', exact: true }).click();
  14 |   await page.getByLabel('Base-unit selling price', { exact: true }).fill('12.50');
  15 |   await page.getByRole('button', { name: 'Save selling price', exact: true }).click();
  16 |   await expect(
  17 |     page.getByText('Selling price saved. You can continue to Quantity or finish setup.'),
  18 |   ).toBeVisible();
  19 |   await expect(page.getByRole('alert')).toHaveCount(0);
  20 |   await page.getByRole('button', { name: 'Done', exact: true }).click();
  21 |   await page.evaluate(() => {
  22 |     location.hash = '/pos';
  23 |   });
  24 |   const search = page.getByRole('combobox', { name: 'POS product search' });
  25 |   await search.fill('SOLD-TEST');
  26 |   const sold = page.getByRole('button', { name: 'Sold SOLD-TEST · Sold out test', exact: true });
  27 |   await expect(sold).toBeDisabled();
  28 |   await expect(sold).toHaveText('Sold');
  29 |   await page.getByRole('option', { name: /Sold out test.*Sold/ }).click();
  30 |   await expect(page.getByText('Your cart is empty.', { exact: false })).toBeVisible();
  31 |   await page.getByRole('button', { name: 'Sold out test', exact: true }).click();
  32 |   await expect(
  33 |     page.getByRole('dialog').getByRole('button', { name: 'Sold', exact: true }),
  34 |   ).toBeDisabled();
  35 |   for (const width of [390, 1440]) {
  36 |     await page.setViewportSize({ width, height: 900 });
  37 |     await expect(page.getByRole('dialog')).toBeVisible();
  38 |     expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(
  39 |       true,
  40 |     );
  41 |   }
  42 | });
  43 | 
```