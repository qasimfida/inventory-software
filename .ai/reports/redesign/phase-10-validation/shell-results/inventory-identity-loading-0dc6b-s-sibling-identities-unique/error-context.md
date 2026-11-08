# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: inventory-identity.spec.ts >> loading warehouse planning alongside inventory keeps sibling identities unique
- Location: tests/shell/inventory-identity.spec.ts:3:1

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByText('Reorder policies and order holds', { exact: true })
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" getByText('Reorder policies and order holds', { exact: true }) with timeout 5000ms
  - waiting for getByText('Reorder policies and order holds', { exact: true })

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
      - combobox "Search products"
      - button "Filters"
      - button "Refresh catalog"
      - tablist "Catalog":
        - tab "Catalog list view": List
        - tab "Catalog grid view" [selected]: Grid
      - tabpanel "Catalog grid view":
        - paragraph: 36 products
        - list:
          - listitem:
            - checkbox "Select Oak dining chair · Natural 1 for online store"
            - text: No image available
            - heading "View details for Oak dining chair · Natural 1" [level=3]:
              - button "View details for Oak dining chair · Natural 1": Oak dining chair · Natural 1
            - text: HP-001 active
            - paragraph: $25.00 / EA · base price
            - button "Actions for HP-001"
          - listitem:
            - checkbox "Select Linen lounge cushion · Natural 2 for online store"
            - text: No image available
            - heading "View details for Linen lounge cushion · Natural 2" [level=3]:
              - button "View details for Linen lounge cushion · Natural 2": Linen lounge cushion · Natural 2
            - text: HP-002 active
            - paragraph: $30.00 / EA · base price
            - button "Actions for HP-002"
          - listitem:
            - checkbox "Select Ceramic serving bowl · Natural 3 for online store"
            - text: No image available
            - heading "View details for Ceramic serving bowl · Natural 3" [level=3]:
              - button "View details for Ceramic serving bowl · Natural 3": Ceramic serving bowl · Natural 3
            - text: HP-003 active
            - paragraph: $35.00 / EA · base price
            - button "Actions for HP-003"
          - listitem:
            - checkbox "Select Adjustable desk lamp · Natural 4 for online store"
            - text: No image available
            - heading "View details for Adjustable desk lamp · Natural 4" [level=3]:
              - button "View details for Adjustable desk lamp · Natural 4": Adjustable desk lamp · Natural 4
            - text: HP-004 active
            - paragraph: $40.00 / EA · base price
            - button "Actions for HP-004"
          - listitem:
            - checkbox "Select Walnut side table · Natural 5 for online store"
            - text: No image available
            - heading "View details for Walnut side table · Natural 5" [level=3]:
              - button "View details for Walnut side table · Natural 5": Walnut side table · Natural 5
            - text: HP-005 active
            - paragraph: $45.00 / EA · base price
            - button "Actions for HP-005"
          - listitem:
            - checkbox "Select Woven storage basket · Natural 6 for online store"
            - text: No image available
            - heading "View details for Woven storage basket · Natural 6" [level=3]:
              - button "View details for Woven storage basket · Natural 6": Woven storage basket · Natural 6
            - text: HP-006 active
            - paragraph: $50.00 / EA · base price
            - button "Actions for HP-006"
          - listitem:
            - checkbox "Select Natural cotton throw · Natural 7 for online store"
            - text: No image available
            - heading "View details for Natural cotton throw · Natural 7" [level=3]:
              - button "View details for Natural cotton throw · Natural 7": Natural cotton throw · Natural 7
            - text: HP-007 active
            - paragraph: $55.00 / EA · base price
            - button "Actions for HP-007"
          - listitem:
            - checkbox "Select Modular shelving with adjustable compartments and protective backing · Natural 8 for online store"
            - text: No image available
            - heading "View details for Modular shelving with adjustable compartments and protective backing · Natural 8" [level=3]:
              - button "View details for Modular shelving with adjustable compartments and protective backing · Natural 8": Modular shelving with adjustable compartments and protective backing · Natural 8
            - text: HP-008 active
            - paragraph: $60.00 / EA · base price
            - button "Actions for HP-008"
          - listitem:
            - checkbox "Select Oak dining chair · Slate 9 for online store"
            - text: No image available
            - heading "View details for Oak dining chair · Slate 9" [level=3]:
              - button "View details for Oak dining chair · Slate 9": Oak dining chair · Slate 9
            - text: HP-009 active
            - paragraph: $65.00 / EA · base price
            - button "Actions for HP-009"
          - listitem:
            - checkbox "Select Linen lounge cushion · Slate 10 for online store"
            - text: No image available
            - heading "View details for Linen lounge cushion · Slate 10" [level=3]:
              - button "View details for Linen lounge cushion · Slate 10": Linen lounge cushion · Slate 10
            - text: HP-010 active
            - paragraph: $70.00 / EA · base price
            - button "Actions for HP-010"
          - listitem:
            - checkbox "Select Ceramic serving bowl · Slate 11 for online store"
            - text: No image available
            - heading "View details for Ceramic serving bowl · Slate 11" [level=3]:
              - button "View details for Ceramic serving bowl · Slate 11": Ceramic serving bowl · Slate 11
            - text: HP-011 active
            - paragraph: $75.00 / EA · base price
            - button "Actions for HP-011"
          - listitem:
            - checkbox "Select Adjustable desk lamp · Slate 12 for online store"
            - text: No image available
            - heading "View details for Adjustable desk lamp · Slate 12" [level=3]:
              - button "View details for Adjustable desk lamp · Slate 12": Adjustable desk lamp · Slate 12
            - text: HP-012 active
            - paragraph: $80.00 / EA · base price
            - button "Actions for HP-012"
          - listitem:
            - checkbox "Select Walnut side table · Slate 13 for online store"
            - text: No image available
            - heading "View details for Walnut side table · Slate 13" [level=3]:
              - button "View details for Walnut side table · Slate 13": Walnut side table · Slate 13
            - text: HP-013 active
            - paragraph: $85.00 / EA · base price
            - button "Actions for HP-013"
          - listitem:
            - checkbox "Select Woven storage basket · Slate 14 for online store"
            - text: No image available
            - heading "View details for Woven storage basket · Slate 14" [level=3]:
              - button "View details for Woven storage basket · Slate 14": Woven storage basket · Slate 14
            - text: HP-014 active
            - paragraph: $90.00 / EA · base price
            - button "Actions for HP-014"
          - listitem:
            - checkbox "Select Natural cotton throw · Slate 15 for online store"
            - text: No image available
            - heading "View details for Natural cotton throw · Slate 15" [level=3]:
              - button "View details for Natural cotton throw · Slate 15": Natural cotton throw · Slate 15
            - text: HP-015 active
            - paragraph: $95.00 / EA · base price
            - button "Actions for HP-015"
          - listitem:
            - checkbox "Select Modular shelving with adjustable compartments and protective backing · Slate 16 for online store"
            - text: No image available
            - heading "View details for Modular shelving with adjustable compartments and protective backing · Slate 16" [level=3]:
              - button "View details for Modular shelving with adjustable compartments and protective backing · Slate 16": Modular shelving with adjustable compartments and protective backing · Slate 16
            - text: HP-016 active
            - paragraph: $100.00 / EA · base price
            - button "Actions for HP-016"
          - listitem:
            - checkbox "Select Oak dining chair · Sand 17 for online store"
            - text: No image available
            - heading "View details for Oak dining chair · Sand 17" [level=3]:
              - button "View details for Oak dining chair · Sand 17": Oak dining chair · Sand 17
            - text: HP-017 active
            - paragraph: $105.00 / EA · base price
            - button "Actions for HP-017"
          - listitem:
            - checkbox "Select Linen lounge cushion · Sand 18 for online store"
            - text: No image available
            - heading "View details for Linen lounge cushion · Sand 18" [level=3]:
              - button "View details for Linen lounge cushion · Sand 18": Linen lounge cushion · Sand 18
            - text: HP-018 active
            - paragraph: $110.00 / EA · base price
            - button "Actions for HP-018"
          - listitem:
            - checkbox "Select Ceramic serving bowl · Sand 19 for online store"
            - text: No image available
            - heading "View details for Ceramic serving bowl · Sand 19" [level=3]:
              - button "View details for Ceramic serving bowl · Sand 19": Ceramic serving bowl · Sand 19
            - text: HP-019 active
            - paragraph: $115.00 / EA · base price
            - button "Actions for HP-019"
          - listitem:
            - checkbox "Select Adjustable desk lamp · Sand 20 for online store"
            - text: Online No image available
            - heading "View details for Adjustable desk lamp · Sand 20" [level=3]:
              - button "View details for Adjustable desk lamp · Sand 20": Adjustable desk lamp · Sand 20
            - text: HP-020 active
            - paragraph: $120.00 / EA · base price
            - button "Actions for HP-020"
          - listitem:
            - checkbox "Select Walnut side table · Sand 21 for online store"
            - img "Walnut side table · Sand 21"
            - heading "View details for Walnut side table · Sand 21" [level=3]:
              - button "View details for Walnut side table · Sand 21": Walnut side table · Sand 21
            - text: HP-021 active
            - paragraph: $125.00 / EA · base price
            - button "Actions for HP-021"
          - listitem:
            - checkbox "Select Woven storage basket · Sand 22 for online store"
            - img "Woven storage basket · Sand 22"
            - heading "View details for Woven storage basket · Sand 22" [level=3]:
              - button "View details for Woven storage basket · Sand 22": Woven storage basket · Sand 22
            - text: HP-022 active
            - paragraph: $130.00 / EA · base price
            - button "Actions for HP-022"
          - listitem:
            - checkbox "Select Natural cotton throw · Sand 23 for online store"
            - text: Online
            - img "Natural cotton throw · Sand 23"
            - heading "View details for Natural cotton throw · Sand 23" [level=3]:
              - button "View details for Natural cotton throw · Sand 23": Natural cotton throw · Sand 23
            - text: HP-023 active
            - paragraph: $135.00 / EA · base price
            - button "Actions for HP-023"
          - listitem:
            - checkbox "Select Modular shelving with adjustable compartments and protective backing · Sand 24 for online store"
            - img "Modular shelving with adjustable compartments and protective backing · Sand 24"
            - heading "View details for Modular shelving with adjustable compartments and protective backing · Sand 24" [level=3]:
              - button "View details for Modular shelving with adjustable compartments and protective backing · Sand 24": Modular shelving with adjustable compartments and protective backing · Sand 24
            - text: HP-024 active
            - paragraph: $140.00 / EA · base price
            - button "Actions for HP-024"
          - listitem:
            - checkbox "Select Oak dining chair · Forest 25 for online store"
            - img "Oak dining chair · Forest 25"
            - heading "View details for Oak dining chair · Forest 25" [level=3]:
              - button "View details for Oak dining chair · Forest 25": Oak dining chair · Forest 25
            - text: HP-025 active
            - paragraph: $145.00 / EA · base price
            - button "Actions for HP-025"
        - navigation "products pagination":
          - button "Previous products" [disabled]
          - button "Page 1": "1"
          - button "Page 2": "2"
          - button "Next products"
```

# Test source

```ts
  1  | import { expect, test } from '@playwright/test';
  2  | 
  3  | test('loading warehouse planning alongside inventory keeps sibling identities unique', async ({
  4  |   page,
  5  | }) => {
  6  |   const duplicateKeys: string[] = [];
  7  |   page.on('console', (message) => {
  8  |     if (/same key|unique.*key/i.test(message.text())) duplicateKeys.push(message.text());
  9  |   });
  10 |   await page.goto('/');
  11 |   await page.getByLabel('Account email').fill('owner@demo.example.test');
  12 |   await page.getByLabel('Password', { exact: true }).fill('local-demo');
  13 |   await page.getByRole('button', { name: 'Log in', exact: true }).click();
  14 |   await expect(page).toHaveURL(/dashboard/);
  15 |   await page.evaluate(() => {
  16 |     location.hash = '/inventory';
  17 |   });
  18 |   await expect(page.getByText('HP-001', { exact: false }).first()).toBeVisible();
> 19 |   await expect(page.getByText('Reorder policies and order holds', { exact: true })).toBeVisible();
     |                                                                                     ^ Error: expect(locator).toBeVisible() failed
  20 |   expect(duplicateKeys).toEqual([]);
  21 | });
  22 | 
```