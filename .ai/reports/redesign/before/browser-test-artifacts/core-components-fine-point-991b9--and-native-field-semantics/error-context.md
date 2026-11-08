# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: core-components.spec.ts >> fine-pointer dimensions, loading geometry and native field semantics
- Location: tests/browser/core-components.spec.ts:3:1

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: 40
Received: 35
```

# Page snapshot

```yaml
- generic [ref=e2]:
  - link "Skip to content" [ref=e3] [cursor=pointer]:
    - /url: "#main"
  - main [ref=e4]:
    - generic [ref=e5]:
      - link "Back to workspace" [ref=e6] [cursor=pointer]:
        - /url: "#/"
      - heading "Design system" [level=1] [ref=e7]
      - paragraph [ref=e8]: Actual application components. All examples are local and reset on reload; no account preferences or business records are saved.
    - generic [ref=e9]:
      - text: Appearance
      - combobox [aria-hidden] [ref=e10] [cursor=pointer]
      - combobox "Appearance" [ref=e11] [cursor=pointer]:
        - generic: System
    - region "Showcase guide" [ref=e15]:
      - heading "Component library" [level=2] [ref=e16]
      - navigation "Showcase sections" [ref=e17]:
        - button "Tokens, themes, typography and spacing" [ref=e18] [cursor=pointer]
        - button "Buttons, badges, navigation and pagination" [ref=e20] [cursor=pointer]
        - button "Cards, tables, dates and disclosures" [ref=e22] [cursor=pointer]
        - button "Custom workspace controls" [ref=e24] [cursor=pointer]
        - button "Inputs, validation and confirmation dialogs" [ref=e26] [cursor=pointer]
        - button "Loading, empty, offline and error states" [ref=e28] [cursor=pointer]
        - button "Menus and status feedback" [ref=e30] [cursor=pointer]
      - paragraph [ref=e32]: Use Tab to inspect focus, hover with a pointer, and activate the examples to inspect selected, invalid, loading and destructive states. Appearance changes only this preview.
      - generic "Icon size variants" [ref=e33]:
        - button "small search icon" [ref=e34] [cursor=pointer]
        - button "medium search icon" [ref=e36] [cursor=pointer]
        - button "large search icon" [ref=e38] [cursor=pointer]
      - heading [level=3] [ref=e42]:
        - button "Tabs, popovers, tooltips, drawers and notifications" [ref=e43] [cursor=pointer]
    - region "Design tokens" [ref=e47]:
      - heading "Tokens and appearance" [level=2] [ref=e48]
      - paragraph [ref=e49]: Semantic CSS variables drive both previews and the generated native palette. Change Appearance to inspect the whole page.
      - generic [ref=e50]:
        - region "light token preview" [ref=e51]:
          - heading "Light" [level=3] [ref=e52]
          - list [ref=e53]:
            - listitem [ref=e54]:
              - code [ref=e56]: background
              - generic [ref=e57]: "#f5f7fa"
            - listitem [ref=e58]:
              - code [ref=e60]: card
              - generic [ref=e61]: "#ffffff"
            - listitem [ref=e62]:
              - code [ref=e64]: elevated
              - generic [ref=e65]: "#ffffff"
            - listitem [ref=e66]:
              - code [ref=e68]: primary
              - generic [ref=e69]: "#2469bd"
            - listitem [ref=e70]:
              - code [ref=e72]: secondary
              - generic [ref=e73]: "#edf4fc"
            - listitem [ref=e74]:
              - code [ref=e76]: muted
              - generic [ref=e77]: "#f5f7fa"
            - listitem [ref=e78]:
              - code [ref=e80]: destructive
              - generic [ref=e81]: "#a62424"
            - listitem [ref=e82]:
              - code [ref=e84]: success
              - generic [ref=e85]: "#166534"
            - listitem [ref=e86]:
              - code [ref=e88]: warning
              - generic [ref=e89]: "#854d0e"
            - listitem [ref=e90]:
              - code [ref=e92]: info
              - generic [ref=e93]: "#1d4ed8"
            - listitem [ref=e94]:
              - code [ref=e96]: sidebar
              - generic [ref=e97]: "#edf2f8"
            - listitem [ref=e98]:
              - code [ref=e100]: selected
              - generic [ref=e101]: "#deedff"
            - listitem [ref=e102]:
              - code [ref=e104]: table-header
              - generic [ref=e105]: "#f5f7fa"
            - listitem [ref=e106]:
              - code [ref=e108]: table-hover
              - generic [ref=e109]: "#edf2f8"
            - listitem [ref=e110]:
              - code [ref=e112]: table-selected
              - generic [ref=e113]: "#deedff"
            - listitem [ref=e114]:
              - code [ref=e116]: navigation-selected
              - generic [ref=e117]: "#deedff"
        - region "dark token preview" [ref=e118]:
          - heading "Dark" [level=3] [ref=e119]
          - list [ref=e120]:
            - listitem [ref=e121]:
              - code [ref=e123]: background
              - generic [ref=e124]: "#131923"
            - listitem [ref=e125]:
              - code [ref=e127]: card
              - generic [ref=e128]: "#1c2532"
            - listitem [ref=e129]:
              - code [ref=e131]: elevated
              - generic [ref=e132]: "#253143"
            - listitem [ref=e133]:
              - code [ref=e135]: primary
              - generic [ref=e136]: "#8bc0ff"
            - listitem [ref=e137]:
              - code [ref=e139]: secondary
              - generic [ref=e140]: "#2b3b50"
            - listitem [ref=e141]:
              - code [ref=e143]: muted
              - generic [ref=e144]: "#253143"
            - listitem [ref=e145]:
              - code [ref=e147]: destructive
              - generic [ref=e148]: "#ffb4b4"
            - listitem [ref=e149]:
              - code [ref=e151]: success
              - generic [ref=e152]: "#91dfa9"
            - listitem [ref=e153]:
              - code [ref=e155]: warning
              - generic [ref=e156]: "#f5d38c"
            - listitem [ref=e157]:
              - code [ref=e159]: info
              - generic [ref=e160]: "#a9c9ff"
            - listitem [ref=e161]:
              - code [ref=e163]: sidebar
              - generic [ref=e164]: "#19222e"
            - listitem [ref=e165]:
              - code [ref=e167]: selected
              - generic [ref=e168]: "#203f63"
            - listitem [ref=e169]:
              - code [ref=e171]: table-header
              - generic [ref=e172]: "#253143"
            - listitem [ref=e173]:
              - code [ref=e175]: table-hover
              - generic [ref=e176]: "#2b3b50"
            - listitem [ref=e177]:
              - code [ref=e179]: table-selected
              - generic [ref=e180]: "#203f63"
            - listitem [ref=e181]:
              - code [ref=e183]: navigation-selected
              - generic [ref=e184]: "#203f63"
      - heading "Typography and spacing" [level=3] [ref=e185]
      - paragraph [ref=e186]: System fonts · 12 / 13 / 14 / 16 / 20 / 28px · 4px spacing unit · 40px desktop, 44px touch and 48-unit native targets. Text size scales the hierarchy; compact density preserves minimum targets.
      - list "Spacing scale" [ref=e187]:
        - listitem [ref=e188]: 1 × spacing unit
        - listitem [ref=e190]: 2 × spacing unit
        - listitem [ref=e192]: 3 × spacing unit
        - listitem [ref=e194]: 4 × spacing unit
        - listitem [ref=e196]: 6 × spacing unit
        - listitem [ref=e198]: 8 × spacing unit
      - heading "Card heading" [level=3] [ref=e200]
      - paragraph [ref=e201]: Label and table text
      - paragraph [ref=e202]: Supporting text
      - paragraph [ref=e203]: Readable body copy and 1,250.00 numeric values.
    - region [ref=e204]:
      - heading "Actions, status and common components" [level=2] [ref=e205]
      - generic [ref=e206]:
        - button "Primary example" [ref=e207] [cursor=pointer]
        - button "Secondary example" [ref=e209] [cursor=pointer]
        - button "A longer action label that wraps on small screens" [ref=e211] [cursor=pointer]
        - button "Destructive example" [ref=e213] [cursor=pointer]
        - button "Saving example" [disabled]
        - button "Refresh example" [ref=e215] [cursor=pointer]
      - generic [ref=e217]:
        - generic [ref=e218]: neutral
        - generic [ref=e219]: success
        - generic [ref=e220]: warning
        - generic [ref=e221]: error
        - generic [ref=e222]: info
      - generic [ref=e223]:
        - text: Example notes
        - textbox "Example notes" [ref=e224]:
          - /placeholder: Add a note for this local example
      - region "Control interaction states" [ref=e225]:
        - heading "Control interaction states" [level=3] [ref=e226]
        - paragraph [ref=e227]: Short choices open directly. Larger collections include search; static collections can set searchable=false.
        - combobox [aria-hidden] [ref=e228] [cursor=pointer]
        - combobox "Preview yes or no" [ref=e229] [cursor=pointer]:
          - generic: "Yes"
        - combobox [aria-hidden] [ref=e233] [cursor=pointer]
        - combobox "Preview searchable locations" [ref=e234] [cursor=pointer]:
          - generic [ref=e235]: Example location 1
        - generic [ref=e239]:
          - button "Small example" [ref=e240] [cursor=pointer]
          - button "Large example" [ref=e242] [cursor=pointer]
          - button "Ghost example" [ref=e244] [cursor=pointer]
          - button "Link example" [ref=e246] [cursor=pointer]
          - button "Disabled example" [disabled]
          - button "Toggle example" [ref=e248] [cursor=pointer]
          - button "Stable loading example" [ref=e250] [cursor=pointer]
          - button "Finish local loading" [ref=e252] [cursor=pointer]
        - generic [ref=e254]:
          - generic [ref=e255]: Read-only reference
          - paragraph [ref=e256]: Selectable text; included in form data.
          - textbox "Read-only reference" [ref=e257]: REF-EXAMPLE
        - generic [ref=e258]:
          - generic [ref=e259]: Disabled field
          - paragraph [ref=e260]: Unavailable controls do not submit values.
          - textbox "Disabled field" [disabled] [ref=e261]: Unavailable
        - generic [ref=e262]:
          - generic [ref=e263]: Invalid example
          - textbox "Invalid example" [invalid] [ref=e264]: Example value
          - paragraph [ref=e265]: Example error linked to its field.
        - generic [ref=e266]:
          - generic [ref=e267]: Select with unavailable option
          - combobox [aria-hidden] [ref=e268] [cursor=pointer]
          - combobox "Select with unavailable option" [ref=e269] [cursor=pointer]:
            - generic: Available option
        - generic [ref=e273]:
          - checkbox "Disabled selected checkbox" [checked] [disabled] [ref=e274]
          - text: Disabled selected checkbox
      - status "Loading content" [ref=e275]
      - navigation "Example navigation" [ref=e278]:
        - generic [ref=e279]:
          - button "First section" [ref=e280] [cursor=pointer]
          - button "Second section" [ref=e283] [cursor=pointer]
      - paragraph [ref=e286]: "Selected example section: first"
      - navigation "Example icon rail" [ref=e288]:
        - generic [ref=e289]:
          - button "First section" [ref=e290] [cursor=pointer]
          - button "Second section" [ref=e293] [cursor=pointer]
      - navigation "example records pagination" [ref=e296]:
        - button "Previous example records" [disabled]
        - button "Page 1" [ref=e297] [cursor=pointer]:
          - generic [ref=e298]: "1"
        - button "Page 2" [ref=e299] [cursor=pointer]:
          - generic [ref=e300]: "2"
        - generic "More pages may be available" [ref=e301]: …
        - button "Next example records" [ref=e302] [cursor=pointer]
      - paragraph [ref=e304]: "Exact money: $1234567890123.45"
      - paragraph [ref=e305]:
        - text: "Business time:"
        - time [ref=e306]: Oct 20, 2026, 5:00 PM (Asia/Karachi)
      - button "Preview command form" [ref=e307] [cursor=pointer]
      - status
    - region [ref=e309]:
      - heading "Preference controls" [level=2] [ref=e310]
      - generic [ref=e311]:
        - generic [ref=e312]:
          - text: Example effects
          - paragraph [ref=e313]: Local example only; no account settings are saved.
        - switch "Example effects" [ref=e314] [cursor=pointer]
      - generic [ref=e316]:
        - generic [ref=e317]: Disabled switch
        - switch "Disabled switch" [checked] [disabled] [ref=e318]
      - group "Example density" [ref=e320]:
        - generic [ref=e322]:
          - generic [ref=e323]:
            - radio "compact" [ref=e324]
            - generic [ref=e325]: compact
          - generic [ref=e326]:
            - radio "comfortable" [checked] [ref=e327]
            - generic [ref=e328]: comfortable
      - status [ref=e329]: Effects disabled · comfortable
    - generic [ref=e330]:
      - heading "Inventory controls" [level=2] [ref=e331]
      - region "Example setup" [ref=e332]:
        - heading "Example setup" [level=3] [ref=e337]
        - paragraph [ref=e338]: 1 of 2 steps complete
        - 'progressbar "Example setup: 1 of 2 steps complete" [ref=e339]'
        - link "Continue setup" [ref=e341] [cursor=pointer]:
          - /url: "#/dev/components"
        - heading [level=3] [ref=e344]:
          - button "View all steps" [ref=e345] [cursor=pointer]
      - paragraph [ref=e349]: Local examples; no business requests are made.
      - combobox "Find example product" [ref=e352]
      - button "Actions for Example product" [ref=e353] [cursor=pointer]
      - generic [ref=e355]:
        - text: Example category
        - combobox [aria-hidden] [ref=e356] [cursor=pointer]
        - combobox "Example category" [ref=e357] [cursor=pointer]:
          - generic: All categories
      - generic [ref=e361]:
        - text: Example quantity
        - generic [ref=e362]:
          - button "Decrease Example quantity" [disabled]
          - textbox "Example quantity" [ref=e363]: "1"
          - button "Increase Example quantity" [ref=e364] [cursor=pointer]
      - paragraph [ref=e366]: Loaded 1 local example batches
      - button "Load more local examples" [ref=e368] [cursor=pointer]
      - navigation "example products pagination" [ref=e370]:
        - button "Previous example products" [disabled]
        - button "Page 1" [ref=e371] [cursor=pointer]:
          - generic [ref=e372]: "1"
        - button "Page 2" [ref=e373] [cursor=pointer]:
          - generic [ref=e374]: "2"
        - generic [aria-hidden] [ref=e375]: …
        - button "Page 16" [ref=e376] [cursor=pointer]:
          - generic [ref=e377]: "16"
        - button "Next example products" [ref=e378] [cursor=pointer]
    - generic [ref=e380]:
      - heading "Navigation, drawers and record views" [level=2] [ref=e381]
      - generic [ref=e382]:
        - generic [ref=e384]:
          - generic [aria-hidden] [ref=e385]: AL
          - generic [ref=e386]:
            - generic [ref=e387]: alex
            - generic [ref=e388]: owner
        - generic [ref=e390]:
          - generic [aria-hidden] [ref=e391]: EX
          - generic [ref=e392]:
            - generic [ref=e393]: Example business
            - generic [ref=e394]: owner · Main store
      - generic [ref=e396]:
        - heading [level=3] [ref=e397]:
          - button "Example section" [expanded] [ref=e398] [cursor=pointer]
        - region "Example section" [ref=e402]:
          - paragraph [ref=e403]: Chevron accordion with keyboard navigation.
      - button "Example filters" [ref=e404] [cursor=pointer]
      - button "Open example form drawer" [ref=e406] [cursor=pointer]
      - button "Inspect tooltip" [ref=e408] [cursor=pointer]
      - generic [ref=e410]:
        - tablist "Example overflow tabs" [ref=e412]:
          - tab "general" [selected] [ref=e413] [cursor=pointer]
          - tab "appearance" [ref=e414] [cursor=pointer]
          - tab "accessibility" [ref=e415] [cursor=pointer]
          - tab "device" [ref=e416] [cursor=pointer]
          - tab "notifications" [ref=e417] [cursor=pointer]
          - tab "security" [ref=e418] [cursor=pointer]
          - tab "integrations" [ref=e419] [cursor=pointer]
        - tabpanel "general" [ref=e420]: Local general preview.
      - progressbar "Example measured progress" [ref=e421]
      - progressbar "Example unknown progress" [ref=e423]
      - text: Description editor
      - generic [ref=e425]:
        - toolbar "Description editor formatting" [ref=e426]:
          - button "Bold" [ref=e427] [cursor=pointer]
          - button "Italic" [ref=e431] [cursor=pointer]
          - button "Underline" [ref=e434] [cursor=pointer]
          - button "Numbered list" [ref=e438] [cursor=pointer]
          - button "Bulleted list" [ref=e443] [cursor=pointer]
          - button "Insert link" [ref=e445] [cursor=pointer]
          - button "Clear formatting" [ref=e450] [cursor=pointer]
        - generic [ref=e457]:
          - textbox "Description editor" [ref=e458]:
            - paragraph [ref=e459]: Example product description
          - text: "Visit URL: EditRemove"
        - paragraph [ref=e460]: 27/2000 characters including formatting
      - generic [ref=e461]: Example product description
      - generic [ref=e462]:
        - generic [ref=e463]:
          - combobox "Search example records" [ref=e467]
          - tablist "example records" [ref=e469]:
            - tab "example records list view" [selected] [ref=e470] [cursor=pointer]: List
            - tab "example records grid view" [ref=e472] [cursor=pointer]: Grid
          - button "Add example record" [ref=e478] [cursor=pointer]
        - tabpanel "example records list view" [ref=e480]:
          - region "example records" [ref=e481]:
            - table [ref=e482]:
              - rowgroup [ref=e483]:
                - row [ref=e484]:
                  - columnheader "Customer" [ref=e485]
                  - columnheader "Reference" [ref=e486]
                  - columnheader "Currency" [ref=e487]
                  - columnheader "Status" [ref=e488]
              - rowgroup [ref=e489]:
                - row [ref=e490]:
                  - rowheader [ref=e491]:
                    - button "Example customer" [ref=e492] [cursor=pointer]
                  - cell "LOCAL-1" [ref=e494]
                  - cell "USD" [ref=e495]
                  - cell "active" [ref=e496]
    - region "Data presentation examples" [ref=e498]:
      - heading "Data presentation" [level=2] [ref=e499]
      - generic [ref=e500]:
        - generic [ref=e501]:
          - paragraph [ref=e502]: Exact amount example
          - paragraph [ref=e503]: "9007199254740993"
          - paragraph [ref=e504]: USD minor units · local example
        - generic [ref=e505]:
          - paragraph [ref=e506]: Quantity example
          - paragraph [ref=e507]: "1234.567890"
          - paragraph [ref=e508]: Units · local example
      - paragraph [ref=e509]: Local examples; exact values and units remain visible.
      - region "Exact-value example table" [ref=e510]:
        - table [ref=e511]:
          - caption [ref=e512]: Example values, not business totals
          - rowgroup [ref=e513]:
            - row [ref=e514]:
              - columnheader "Measure" [ref=e515]
              - columnheader "Value" [ref=e516]
              - columnheader "Unit / status" [ref=e517]
          - rowgroup [ref=e518]:
            - row [ref=e519]:
              - rowheader "Exact amount" [ref=e520]
              - cell "9007199254740993" [ref=e521]
              - cell "USD minor units" [ref=e522]
            - row [ref=e523]:
              - rowheader "Quantity" [ref=e524]
              - cell "1234.567890" [ref=e525]
              - cell "each" [ref=e526]
            - row [ref=e527]:
              - rowheader "Recorded state" [ref=e528]
              - cell "0" [ref=e529]
              - cell "Example only" [ref=e530]
      - generic [ref=e532]:
        - generic [ref=e533]: Example date (UTC)
        - paragraph [ref=e534]: Native date picker; the stored date remains YYYY-MM-DD.
        - textbox "Example date (UTC)" [ref=e535]: 2026-10-01
      - heading [level=3] [ref=e538]:
        - button "Expandable example" [ref=e539] [cursor=pointer]
    - region "Warehouse and offline control examples" [ref=e543]:
      - generic [ref=e545]:
        - heading "Warehouse and offline helpers" [level=2] [ref=e546]
        - paragraph [ref=e547]: Shared screen structure and exact, labelled transaction values.
      - generic "Example transaction details" [ref=e548]:
        - generic [ref=e549]:
          - term [ref=e550]: Reference
          - definition [ref=e551]: COUNT-EXAMPLE
        - generic [ref=e552]:
          - term [ref=e553]: Exact quantity
          - definition [ref=e554]: "1234.567890"
        - generic [ref=e555]:
          - term [ref=e556]: Amount (USD minor units)
          - definition [ref=e557]: "9007199254740993"
        - generic [ref=e558]:
          - term [ref=e559]: Confirmation
          - definition [ref=e560]: Local example only
      - button "Page warehouse Main warehouse" [ref=e561] [cursor=pointer]:
        - generic [ref=e562]:
          - generic [ref=e563]: Page warehouse
          - generic [ref=e564]: Main warehouse
      - generic [ref=e565]:
        - paragraph [ref=e566]: Local controls only. Do not enter a real passphrase in this example.
        - generic [ref=e567]:
          - text: Example warehouse reference
          - textbox "Example warehouse reference" [ref=e568]: COUNT-EXAMPLE
        - generic [ref=e569]:
          - text: Example warehouse
          - combobox [aria-hidden] [ref=e570] [cursor=pointer]
          - combobox "Example warehouse" [ref=e571] [cursor=pointer]:
            - generic: Main warehouse
        - generic [ref=e575]:
          - text: Separate offline passphrase (15–128 characters)
          - textbox "Separate offline passphrase (15–128 characters)" [ref=e576]
        - button "Clear local example passphrase" [ref=e577] [cursor=pointer]
      - status
    - heading [level=3] [ref=e581]:
      - button "Component usage documentation" [ref=e582] [cursor=pointer]
    - heading [level=3] [ref=e588]:
      - button "Web component API reference" [ref=e589] [cursor=pointer]
    - heading [level=3] [ref=e595]:
      - button "Native component API reference" [ref=e596] [cursor=pointer]
    - generic [ref=e600]:
      - region [ref=e601]:
        - heading "Form controls" [level=2] [ref=e602]
        - paragraph [ref=e603]: A local preview only. Nothing is saved or sent.
        - generic [ref=e604]:
          - generic [ref=e605]:
            - generic [ref=e606]:
              - text: Preview label
              - generic [aria-hidden] [ref=e607]: "*"
            - paragraph [ref=e608]: Use a short label, up to 40 characters.
            - textbox "Preview label" [ref=e609]
          - generic [ref=e610]:
            - generic [ref=e611]: Spacing preference
            - combobox [aria-hidden] [ref=e612] [cursor=pointer]
            - combobox "Spacing preference" [ref=e613] [cursor=pointer]:
              - generic: Comfortable
            - combobox [aria-hidden] [ref=e617] [cursor=pointer]
          - generic [ref=e618]:
            - checkbox "Include supporting descriptions" [checked] [ref=e619] [cursor=pointer]
            - checkbox [checked] [aria-hidden]
            - text: Include supporting descriptions
          - generic [ref=e620]:
            - button "Update preview" [ref=e621] [cursor=pointer]
            - button "Reset example" [ref=e623] [cursor=pointer]
          - status
      - region [ref=e625]:
        - heading "Application feedback" [level=2] [ref=e626]
        - button "Filters" [ref=e627] [cursor=pointer]
        - generic [ref=e629]:
          - generic [ref=e630]: Example state
          - combobox [aria-hidden] [ref=e631] [cursor=pointer]
          - combobox "Example state" [ref=e632] [cursor=pointer]:
            - generic: Empty
        - paragraph [ref=e638]: No example records yet
      - region [ref=e639]:
        - heading "Semantic styles" [level=2] [ref=e640]
        - table [ref=e641]:
          - caption [ref=e642]: Color communicates meaning alongside text.
          - rowgroup [ref=e643]:
            - row [ref=e644]:
              - columnheader "Role" [ref=e645]
              - columnheader "Example" [ref=e646]
          - rowgroup [ref=e647]:
            - row [ref=e648]:
              - rowheader "Selected row" [ref=e649]
              - cell "Selection remains readable in either theme" [ref=e650]
            - row [ref=e651]:
              - rowheader "Primary" [ref=e652]
              - cell "Continue an action" [ref=e653]
            - row [ref=e654]:
              - rowheader "Success" [ref=e655]
              - cell "Completed successfully" [ref=e656]
            - row [ref=e657]:
              - rowheader "Error" [ref=e658]
              - cell "Needs attention" [ref=e659]
        - generic [ref=e660]:
          - button "Unavailable" [disabled]
          - button [ref=e661] [cursor=pointer]:
            - generic [ref=e662]:
              - text: Example actions
              - generic [aria-hidden] [ref=e663]: ▾
        - status
    - paragraph [ref=e664]: "Keyboard: Tab between controls, arrow keys within menus, and Escape to dismiss a dialog."
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | test('fine-pointer dimensions, loading geometry and native field semantics', async ({ page }) => {
  4  |   await page.goto('/#/design-system');
  5  |   for (const [name, height] of [
  6  |     ['Primary example', 40],
  7  |     ['Small example', 32],
  8  |     ['Large example', 48],
  9  |     ['Refresh example', 36],
  10 |   ] as const) {
> 11 |     expect((await page.getByRole('button', { name, exact: true }).boundingBox())!.height).toBe(
     |                                                                                           ^ Error: expect(received).toBe(expected) // Object.is equality
  12 |       height,
  13 |     );
  14 |   }
  15 |   const input = page.getByRole('textbox', { name: 'Preview label', exact: true });
  16 |   expect((await input.boundingBox())!.height).toBe(40);
  17 |   const loading = page.getByRole('button', { name: 'Stable loading example', exact: true });
  18 |   const before = await loading.boundingBox();
  19 |   await loading.click();
  20 |   await expect(loading).toBeDisabled();
  21 |   await expect(loading).toHaveAttribute('aria-busy', 'true');
  22 |   const after = await loading.boundingBox();
  23 |   expect(after!.width).toBe(before!.width);
  24 |   expect(after!.height).toBe(before!.height);
  25 |   await page.getByRole('button', { name: 'Finish local loading' }).click();
  26 |   await expect(loading).toBeEnabled();
  27 |   const toggle = page.getByRole('button', { name: 'Toggle example' });
  28 |   await toggle.click();
  29 |   await expect(toggle).toHaveAttribute('aria-pressed', 'true');
  30 |   await page.keyboard.press('Tab');
  31 |   await page.keyboard.press('Shift+Tab');
  32 |   await expect(toggle).toBeFocused();
  33 |   expect(await toggle.evaluate((el) => getComputedStyle(el).outlineStyle)).toBe('solid');
  34 |   await expect(page.getByRole('textbox', { name: 'Read-only reference' })).not.toBeEditable();
  35 |   await expect(page.getByRole('textbox', { name: 'Disabled field' })).toBeDisabled();
  36 |   await expect(page.getByRole('textbox', { name: 'Invalid example' })).toHaveAttribute(
  37 |     'aria-invalid',
  38 |     'true',
  39 |   );
  40 | });
  41 | 
  42 | test('coarse pointers retain touch targets even with compact density', async ({ browser }) => {
  43 |   const context = await browser.newContext({
  44 |     hasTouch: true,
  45 |     viewport: { width: 375, height: 900 },
  46 |   });
  47 |   const page = await context.newPage();
  48 |   await page.goto('http://127.0.0.1:5180/#/design-system');
  49 |   await page.evaluate(() => {
  50 |     document.documentElement.dataset.density = 'compact';
  51 |   });
  52 |   expect(await page.evaluate(() => matchMedia('(pointer: coarse)').matches)).toBe(true);
  53 |   for (const name of ['Small example', 'Primary example', 'Refresh example']) {
  54 |     expect(
  55 |       (await page.getByRole('button', { name, exact: true }).boundingBox())!.height,
  56 |     ).toBeGreaterThanOrEqual(44);
  57 |   }
  58 |   expect(
  59 |     (await page.getByRole('textbox', { name: 'Preview label', exact: true }).boundingBox())!.height,
  60 |   ).toBeGreaterThanOrEqual(44);
  61 |   expect(
  62 |     (await page.locator('label[for=preview-hints]').boundingBox())!.height,
  63 |   ).toBeGreaterThanOrEqual(44);
  64 |   expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(375);
  65 |   await context.close();
  66 | });
  67 | 
  68 | test('action menu escapes clipping and keeps disabled-item keyboard skipping', async ({ page }) => {
  69 |   await page.goto('/#/design-system');
  70 |   const trigger = page.getByRole('button', { name: /Example actions/ });
  71 |   await trigger.evaluate((el) => {
  72 |     const parent = el.parentElement!;
  73 |     parent.style.overflow = 'hidden';
  74 |     parent.style.maxHeight = '44px';
  75 |   });
  76 |   await trigger.focus();
  77 |   await page.keyboard.press('Enter');
  78 |   const menu = page.getByRole('menu');
  79 |   await expect(menu).toBeVisible();
  80 |   expect(
  81 |     await menu.evaluate((el) => el.closest('[role=region]')?.parentElement === document.body),
  82 |   ).toBe(true);
  83 |   await expect(page.getByRole('menuitem', { name: 'Show feedback' })).toBeFocused();
  84 |   await page.keyboard.press('ArrowDown');
  85 |   await expect(page.getByRole('menuitem', { name: 'Clear feedback' })).toBeFocused();
  86 |   await page.keyboard.press('Escape');
  87 |   await expect(trigger).toBeFocused();
  88 | });
  89 | 
```