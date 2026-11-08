# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: stock-planning.spec.ts >> inventory planning renders real components and bounded management forms at wide and narrow widths
- Location: tests/shell/stock-planning.spec.ts:2:1

# Error details

```
Test timeout of 90000ms exceeded.
```

```
Error: locator.click: Test timeout of 90000ms exceeded.
Call log:
  - waiting for getByRole('button', { name: 'Reorder policies and order holds', exact: true })

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
          - heading "Inventory" [level=1] [ref=e275]
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
        - region "Inventory workspace" [ref=e300]:
          - group "Inventory section" [ref=e301]:
            - generic [ref=e303]:
              - generic [ref=e304]:
                - radio "Products & pricing" [checked] [ref=e305]
                - generic [ref=e306]: Products & pricing
              - generic [ref=e307]:
                - radio "Stock & movements" [ref=e308]
                - generic [ref=e309]: Stock & movements
          - region "Product catalog" [ref=e310]:
            - generic [ref=e311]:
              - generic [ref=e312]:
                - heading "Products & pricing" [level=2] [ref=e313]
                - paragraph [ref=e314]: Manage products, categories and pricing across your business.
              - generic [ref=e315]:
                - button "New product" [ref=e316] [cursor=pointer]
                - button "Bulk import" [ref=e318] [cursor=pointer]
                - button "Export shown products" [ref=e320] [cursor=pointer]
            - generic [ref=e322]:
              - generic [ref=e323]:
                - combobox "Search products" [ref=e326]
                - button "Filters" [ref=e327] [cursor=pointer]
                - button "Refresh catalog" [ref=e329] [cursor=pointer]
                - tablist "Catalog" [ref=e332]:
                  - tab "Catalog list view" [ref=e333] [cursor=pointer]: List
                  - tab "Catalog grid view" [selected] [ref=e335] [cursor=pointer]: Grid
              - tabpanel "Catalog grid view" [ref=e342]:
                - paragraph [ref=e343]: 36 products
                - list [ref=e344]:
                  - listitem [ref=e345]:
                    - checkbox "Select Oak dining chair · Natural 1 for online store" [ref=e346] [cursor=pointer]
                    - generic [ref=e347]: No image available
                    - heading [level=3] [ref=e354]:
                      - button "View details for Oak dining chair · Natural 1" [ref=e355] [cursor=pointer]:
                        - generic [ref=e356]: Oak dining chair · Natural 1
                    - generic [ref=e357]:
                      - generic [ref=e358]: HP-001
                      - generic [ref=e359]: active
                    - paragraph [ref=e360]: $25.00 / EA · base price
                    - button "Actions for HP-001" [ref=e362] [cursor=pointer]
                  - listitem [ref=e364]:
                    - checkbox "Select Linen lounge cushion · Natural 2 for online store" [ref=e365] [cursor=pointer]
                    - generic [ref=e366]: No image available
                    - heading [level=3] [ref=e373]:
                      - button "View details for Linen lounge cushion · Natural 2" [ref=e374] [cursor=pointer]:
                        - generic [ref=e375]: Linen lounge cushion · Natural 2
                    - generic [ref=e376]:
                      - generic [ref=e377]: HP-002
                      - generic [ref=e378]: active
                    - paragraph [ref=e379]: $30.00 / EA · base price
                    - button "Actions for HP-002" [ref=e381] [cursor=pointer]
                  - listitem [ref=e383]:
                    - checkbox "Select Ceramic serving bowl · Natural 3 for online store" [ref=e384] [cursor=pointer]
                    - generic [ref=e385]: No image available
                    - heading [level=3] [ref=e392]:
                      - button "View details for Ceramic serving bowl · Natural 3" [ref=e393] [cursor=pointer]:
                        - generic [ref=e394]: Ceramic serving bowl · Natural 3
                    - generic [ref=e395]:
                      - generic [ref=e396]: HP-003
                      - generic [ref=e397]: active
                    - paragraph [ref=e398]: $35.00 / EA · base price
                    - button "Actions for HP-003" [ref=e400] [cursor=pointer]
                  - listitem [ref=e402]:
                    - checkbox "Select Adjustable desk lamp · Natural 4 for online store" [ref=e403] [cursor=pointer]
                    - generic [ref=e404]: No image available
                    - heading [level=3] [ref=e411]:
                      - button "View details for Adjustable desk lamp · Natural 4" [ref=e412] [cursor=pointer]:
                        - generic [ref=e413]: Adjustable desk lamp · Natural 4
                    - generic [ref=e414]:
                      - generic [ref=e415]: HP-004
                      - generic [ref=e416]: active
                    - paragraph [ref=e417]: $40.00 / EA · base price
                    - button "Actions for HP-004" [ref=e419] [cursor=pointer]
                  - listitem [ref=e421]:
                    - checkbox "Select Walnut side table · Natural 5 for online store" [ref=e422] [cursor=pointer]
                    - generic [ref=e423]: No image available
                    - heading [level=3] [ref=e430]:
                      - button "View details for Walnut side table · Natural 5" [ref=e431] [cursor=pointer]:
                        - generic [ref=e432]: Walnut side table · Natural 5
                    - generic [ref=e433]:
                      - generic [ref=e434]: HP-005
                      - generic [ref=e435]: active
                    - paragraph [ref=e436]: $45.00 / EA · base price
                    - button "Actions for HP-005" [ref=e438] [cursor=pointer]
                  - listitem [ref=e440]:
                    - checkbox "Select Woven storage basket · Natural 6 for online store" [ref=e441] [cursor=pointer]
                    - generic [ref=e442]: No image available
                    - heading [level=3] [ref=e449]:
                      - button "View details for Woven storage basket · Natural 6" [ref=e450] [cursor=pointer]:
                        - generic [ref=e451]: Woven storage basket · Natural 6
                    - generic [ref=e452]:
                      - generic [ref=e453]: HP-006
                      - generic [ref=e454]: active
                    - paragraph [ref=e455]: $50.00 / EA · base price
                    - button "Actions for HP-006" [ref=e457] [cursor=pointer]
                  - listitem [ref=e459]:
                    - checkbox "Select Natural cotton throw · Natural 7 for online store" [ref=e460] [cursor=pointer]
                    - generic [ref=e461]: No image available
                    - heading [level=3] [ref=e468]:
                      - button "View details for Natural cotton throw · Natural 7" [ref=e469] [cursor=pointer]:
                        - generic [ref=e470]: Natural cotton throw · Natural 7
                    - generic [ref=e471]:
                      - generic [ref=e472]: HP-007
                      - generic [ref=e473]: active
                    - paragraph [ref=e474]: $55.00 / EA · base price
                    - button "Actions for HP-007" [ref=e476] [cursor=pointer]
                  - listitem [ref=e478]:
                    - checkbox "Select Modular shelving with adjustable compartments and protective backing · Natural 8 for online store" [ref=e479] [cursor=pointer]
                    - generic [ref=e480]: No image available
                    - heading [level=3] [ref=e487]:
                      - button "View details for Modular shelving with adjustable compartments and protective backing · Natural 8" [ref=e488] [cursor=pointer]:
                        - generic [ref=e489]: Modular shelving with adjustable compartments and protective backing · Natural 8
                    - generic [ref=e490]:
                      - generic [ref=e491]: HP-008
                      - generic [ref=e492]: active
                    - paragraph [ref=e493]: $60.00 / EA · base price
                    - button "Actions for HP-008" [ref=e495] [cursor=pointer]
                  - listitem [ref=e497]:
                    - checkbox "Select Oak dining chair · Slate 9 for online store" [ref=e498] [cursor=pointer]
                    - generic [ref=e499]: No image available
                    - heading [level=3] [ref=e506]:
                      - button "View details for Oak dining chair · Slate 9" [ref=e507] [cursor=pointer]:
                        - generic [ref=e508]: Oak dining chair · Slate 9
                    - generic [ref=e509]:
                      - generic [ref=e510]: HP-009
                      - generic [ref=e511]: active
                    - paragraph [ref=e512]: $65.00 / EA · base price
                    - button "Actions for HP-009" [ref=e514] [cursor=pointer]
                  - listitem [ref=e516]:
                    - checkbox "Select Linen lounge cushion · Slate 10 for online store" [ref=e517] [cursor=pointer]
                    - generic [ref=e518]: No image available
                    - heading [level=3] [ref=e525]:
                      - button "View details for Linen lounge cushion · Slate 10" [ref=e526] [cursor=pointer]:
                        - generic [ref=e527]: Linen lounge cushion · Slate 10
                    - generic [ref=e528]:
                      - generic [ref=e529]: HP-010
                      - generic [ref=e530]: active
                    - paragraph [ref=e531]: $70.00 / EA · base price
                    - button "Actions for HP-010" [ref=e533] [cursor=pointer]
                  - listitem [ref=e535]:
                    - checkbox "Select Ceramic serving bowl · Slate 11 for online store" [ref=e536] [cursor=pointer]
                    - generic [ref=e537]: No image available
                    - heading [level=3] [ref=e544]:
                      - button "View details for Ceramic serving bowl · Slate 11" [ref=e545] [cursor=pointer]:
                        - generic [ref=e546]: Ceramic serving bowl · Slate 11
                    - generic [ref=e547]:
                      - generic [ref=e548]: HP-011
                      - generic [ref=e549]: active
                    - paragraph [ref=e550]: $75.00 / EA · base price
                    - button "Actions for HP-011" [ref=e552] [cursor=pointer]
                  - listitem [ref=e554]:
                    - checkbox "Select Adjustable desk lamp · Slate 12 for online store" [ref=e555] [cursor=pointer]
                    - generic [ref=e556]: No image available
                    - heading [level=3] [ref=e563]:
                      - button "View details for Adjustable desk lamp · Slate 12" [ref=e564] [cursor=pointer]:
                        - generic [ref=e565]: Adjustable desk lamp · Slate 12
                    - generic [ref=e566]:
                      - generic [ref=e567]: HP-012
                      - generic [ref=e568]: active
                    - paragraph [ref=e569]: $80.00 / EA · base price
                    - button "Actions for HP-012" [ref=e571] [cursor=pointer]
                  - listitem [ref=e573]:
                    - checkbox "Select Walnut side table · Slate 13 for online store" [ref=e574] [cursor=pointer]
                    - generic [ref=e575]: No image available
                    - heading [level=3] [ref=e582]:
                      - button "View details for Walnut side table · Slate 13" [ref=e583] [cursor=pointer]:
                        - generic [ref=e584]: Walnut side table · Slate 13
                    - generic [ref=e585]:
                      - generic [ref=e586]: HP-013
                      - generic [ref=e587]: active
                    - paragraph [ref=e588]: $85.00 / EA · base price
                    - button "Actions for HP-013" [ref=e590] [cursor=pointer]
                  - listitem [ref=e592]:
                    - checkbox "Select Woven storage basket · Slate 14 for online store" [ref=e593] [cursor=pointer]
                    - generic [ref=e594]: No image available
                    - heading [level=3] [ref=e601]:
                      - button "View details for Woven storage basket · Slate 14" [ref=e602] [cursor=pointer]:
                        - generic [ref=e603]: Woven storage basket · Slate 14
                    - generic [ref=e604]:
                      - generic [ref=e605]: HP-014
                      - generic [ref=e606]: active
                    - paragraph [ref=e607]: $90.00 / EA · base price
                    - button "Actions for HP-014" [ref=e609] [cursor=pointer]
                  - listitem [ref=e611]:
                    - checkbox "Select Natural cotton throw · Slate 15 for online store" [ref=e612] [cursor=pointer]
                    - generic [ref=e613]: No image available
                    - heading [level=3] [ref=e620]:
                      - button "View details for Natural cotton throw · Slate 15" [ref=e621] [cursor=pointer]:
                        - generic [ref=e622]: Natural cotton throw · Slate 15
                    - generic [ref=e623]:
                      - generic [ref=e624]: HP-015
                      - generic [ref=e625]: active
                    - paragraph [ref=e626]: $95.00 / EA · base price
                    - button "Actions for HP-015" [ref=e628] [cursor=pointer]
                  - listitem [ref=e630]:
                    - checkbox "Select Modular shelving with adjustable compartments and protective backing · Slate 16 for online store" [ref=e631] [cursor=pointer]
                    - generic [ref=e632]: No image available
                    - heading [level=3] [ref=e639]:
                      - button "View details for Modular shelving with adjustable compartments and protective backing · Slate 16" [ref=e640] [cursor=pointer]:
                        - generic [ref=e641]: Modular shelving with adjustable compartments and protective backing · Slate 16
                    - generic [ref=e642]:
                      - generic [ref=e643]: HP-016
                      - generic [ref=e644]: active
                    - paragraph [ref=e645]: $100.00 / EA · base price
                    - button "Actions for HP-016" [ref=e647] [cursor=pointer]
                  - listitem [ref=e649]:
                    - checkbox "Select Oak dining chair · Sand 17 for online store" [ref=e650] [cursor=pointer]
                    - generic [ref=e651]: No image available
                    - heading [level=3] [ref=e658]:
                      - button "View details for Oak dining chair · Sand 17" [ref=e659] [cursor=pointer]:
                        - generic [ref=e660]: Oak dining chair · Sand 17
                    - generic [ref=e661]:
                      - generic [ref=e662]: HP-017
                      - generic [ref=e663]: active
                    - paragraph [ref=e664]: $105.00 / EA · base price
                    - button "Actions for HP-017" [ref=e666] [cursor=pointer]
                  - listitem [ref=e668]:
                    - checkbox "Select Linen lounge cushion · Sand 18 for online store" [ref=e669] [cursor=pointer]
                    - generic [ref=e670]: No image available
                    - heading [level=3] [ref=e677]:
                      - button "View details for Linen lounge cushion · Sand 18" [ref=e678] [cursor=pointer]:
                        - generic [ref=e679]: Linen lounge cushion · Sand 18
                    - generic [ref=e680]:
                      - generic [ref=e681]: HP-018
                      - generic [ref=e682]: active
                    - paragraph [ref=e683]: $110.00 / EA · base price
                    - button "Actions for HP-018" [ref=e685] [cursor=pointer]
                  - listitem [ref=e687]:
                    - checkbox "Select Ceramic serving bowl · Sand 19 for online store" [ref=e688] [cursor=pointer]
                    - generic [ref=e689]: No image available
                    - heading [level=3] [ref=e696]:
                      - button "View details for Ceramic serving bowl · Sand 19" [ref=e697] [cursor=pointer]:
                        - generic [ref=e698]: Ceramic serving bowl · Sand 19
                    - generic [ref=e699]:
                      - generic [ref=e700]: HP-019
                      - generic [ref=e701]: active
                    - paragraph [ref=e702]: $115.00 / EA · base price
                    - button "Actions for HP-019" [ref=e704] [cursor=pointer]
                  - listitem [ref=e706]:
                    - checkbox "Select Adjustable desk lamp · Sand 20 for online store" [ref=e707] [cursor=pointer]
                    - generic [ref=e708]: Online
                    - generic [ref=e709]: No image available
                    - heading [level=3] [ref=e716]:
                      - button "View details for Adjustable desk lamp · Sand 20" [ref=e717] [cursor=pointer]:
                        - generic [ref=e718]: Adjustable desk lamp · Sand 20
                    - generic [ref=e719]:
                      - generic [ref=e720]: HP-020
                      - generic [ref=e721]: active
                    - paragraph [ref=e722]: $120.00 / EA · base price
                    - button "Actions for HP-020" [ref=e724] [cursor=pointer]
                  - listitem [ref=e726]:
                    - checkbox "Select Walnut side table · Sand 21 for online store" [ref=e727] [cursor=pointer]
                    - img "Walnut side table · Sand 21" [ref=e729]
                    - heading [level=3] [ref=e730]:
                      - button "View details for Walnut side table · Sand 21" [ref=e731] [cursor=pointer]:
                        - generic [ref=e732]: Walnut side table · Sand 21
                    - generic [ref=e733]:
                      - generic [ref=e734]: HP-021
                      - generic [ref=e735]: active
                    - paragraph [ref=e736]: $125.00 / EA · base price
                    - button "Actions for HP-021" [ref=e738] [cursor=pointer]
                  - listitem [ref=e740]:
                    - checkbox "Select Woven storage basket · Sand 22 for online store" [ref=e741] [cursor=pointer]
                    - img "Woven storage basket · Sand 22" [ref=e743]
                    - heading [level=3] [ref=e744]:
                      - button "View details for Woven storage basket · Sand 22" [ref=e745] [cursor=pointer]:
                        - generic [ref=e746]: Woven storage basket · Sand 22
                    - generic [ref=e747]:
                      - generic [ref=e748]: HP-022
                      - generic [ref=e749]: active
                    - paragraph [ref=e750]: $130.00 / EA · base price
                    - button "Actions for HP-022" [ref=e752] [cursor=pointer]
                  - listitem [ref=e754]:
                    - checkbox "Select Natural cotton throw · Sand 23 for online store" [ref=e755] [cursor=pointer]
                    - generic [ref=e756]: Online
                    - img "Natural cotton throw · Sand 23" [ref=e758]
                    - heading [level=3] [ref=e759]:
                      - button "View details for Natural cotton throw · Sand 23" [ref=e760] [cursor=pointer]:
                        - generic [ref=e761]: Natural cotton throw · Sand 23
                    - generic [ref=e762]:
                      - generic [ref=e763]: HP-023
                      - generic [ref=e764]: active
                    - paragraph [ref=e765]: $135.00 / EA · base price
                    - button "Actions for HP-023" [ref=e767] [cursor=pointer]
                  - listitem [ref=e769]:
                    - checkbox "Select Modular shelving with adjustable compartments and protective backing · Sand 24 for online store" [ref=e770] [cursor=pointer]
                    - img "Modular shelving with adjustable compartments and protective backing · Sand 24" [ref=e772]
                    - heading [level=3] [ref=e773]:
                      - button "View details for Modular shelving with adjustable compartments and protective backing · Sand 24" [ref=e774] [cursor=pointer]:
                        - generic [ref=e775]: Modular shelving with adjustable compartments and protective backing · Sand 24
                    - generic [ref=e776]:
                      - generic [ref=e777]: HP-024
                      - generic [ref=e778]: active
                    - paragraph [ref=e779]: $140.00 / EA · base price
                    - button "Actions for HP-024" [ref=e781] [cursor=pointer]
                  - listitem [ref=e783]:
                    - checkbox "Select Oak dining chair · Forest 25 for online store" [ref=e784] [cursor=pointer]
                    - img "Oak dining chair · Forest 25" [ref=e786]
                    - heading [level=3] [ref=e787]:
                      - button "View details for Oak dining chair · Forest 25" [ref=e788] [cursor=pointer]:
                        - generic [ref=e789]: Oak dining chair · Forest 25
                    - generic [ref=e790]:
                      - generic [ref=e791]: HP-025
                      - generic [ref=e792]: active
                    - paragraph [ref=e793]: $145.00 / EA · base price
                    - button "Actions for HP-025" [ref=e795] [cursor=pointer]
                - navigation "products pagination" [ref=e797]:
                  - button "Previous products" [disabled]
                  - button "Page 1" [ref=e798] [cursor=pointer]:
                    - generic [ref=e799]: "1"
                  - button "Page 2" [ref=e800] [cursor=pointer]:
                    - generic [ref=e801]: "2"
                  - button "Next products" [ref=e802] [cursor=pointer]
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | test('inventory planning renders real components and bounded management forms at wide and narrow widths', async ({
  3  |   page,
  4  | }) => {
  5  |   await page.goto('/');
  6  |   await page.getByLabel('Account email').fill('owner@demo.example.test');
  7  |   await page.getByLabel('Password', { exact: true }).fill('local-demo');
  8  |   await page.getByRole('button', { name: 'Log in', exact: true }).click();
  9  |   await expect(page.getByRole('navigation', { name: 'Business setup' })).toBeVisible();
  10 |   await page.evaluate(() => {
  11 |     location.hash = '/inventory';
  12 |   });
> 13 |   await page.getByRole('button', { name: 'Reorder policies and order holds', exact: true }).click();
     |                                                                                             ^ Error: locator.click: Test timeout of 90000ms exceeded.
  14 |   await expect(page.getByText('DEMO-ORDER-001', { exact: true })).toBeVisible();
  15 |   await expect(
  16 |     page.getByRole('button', { name: 'Save reorder policy', exact: true }),
  17 |   ).toBeVisible();
  18 |   await page.screenshot({
  19 |     path: 'artifacts/qa/screens/milestone-3/stock-planning-web.png',
  20 |     fullPage: true,
  21 |   });
  22 |   await page.setViewportSize({ width: 390, height: 844 });
  23 |   expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
  24 |   await page.getByRole('button', { name: 'Create order stock hold', exact: true }).click();
  25 |   await expect(page.getByRole('dialog')).toContainText('Unique order reference');
  26 |   await expect
  27 |     .poll(async () =>
  28 |       Math.round(
  29 |         (await page.getByRole('dialog').boundingBox())!.x +
  30 |           (await page.getByRole('dialog').boundingBox())!.width,
  31 |       ),
  32 |     )
  33 |     .toBeLessThanOrEqual(390);
  34 |   await page.screenshot({
  35 |     path: 'artifacts/qa/screens/milestone-3/stock-planning-narrow.png',
  36 |     fullPage: false,
  37 |     animations: 'disabled',
  38 |   });
  39 | });
  40 | 
```