# Prompt 5 — application screen refinement

## Scope and impact

This is a presentation pass over the existing workspace, not a new product flow. The actual router remains `/#/` (workspace, authentication, settings, POS and offline views) and `/#/design-system` (developer examples). Workspace sections are controlled navigation, not separate URLs. Existing permission filtering and visited-section state remain in `ManagementWorkflows` and native navigation.

| Layer                                                  | Source / consumers                                                                                  | Change                                                                                                     |
| ------------------------------------------------------ | --------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Authoritative data                                     | Existing API clients and ResourceModel / PosModel                                                   | Reused without change; exact strings and existing date/money formatting                                    |
| Transactions, schema, permissions, REST, subscriptions | API, contracts, shared domain / client packages                                                     | No changes                                                                                                 |
| Persistence, outbox and recovery                       | Existing platform adapters and offline registers                                                    | No changes; local/confirmed/uncertain messages retained                                                    |
| Presentation                                           | `apps/web/src/theme/screens.css`, common ScreenHeader / RecordDetails / CommandForm; feature panels | Consistent headings, filter groups, form spacing, facts, wrapping and action alignment                     |
| Native presentation                                    | `apps/mobile/src/ui/ScreenHeader.tsx`, RecordDetails, native CommandForm and feature consumers      | Native equivalents and vertical spacing; disclosure state preserved                                        |
| Desktop                                                | Existing Tauri web frontend                                                                         | Same DOM components and styles; no native bridge changes                                                   |
| Tests / documentation                                  | Common component tests, native showcase, real-API screen sweep                                      | Exact values, keyboard actions, accessibility, themes, responsive widths and existing transaction journeys |

No new dependencies, domain abstractions or mock screen data. Feature-specific PurchaseDetails, TransferDetails and MovementHistory keep read-only document presentation out of controller components. Common components have live examples and props in [common components](common-components.md).

## Screen inventory

Every implemented top-level section was reviewed. Existing modern layouts are retained where they already meet the shared conventions.

| Screen / subviews                               | Presentation work                                                                                                                                                                  |
| ----------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Authentication, invitation, recovery, sessions  | Retain the existing compact sign-in card and accessible controls; no authentication behavior changes                                                                               |
| Overview dashboard                              | Shared heading/action placement; retain actual KPI/report aggregates, inventory table, date labels, notes and permission visibility                                                |
| Catalog, product editor, categories and pricing | Shared catalog/pricing headers, native spacing and command-form treatment; retain product cards, editing, units and barcode behavior                                               |
| Inventory                                       | Grouped warehouse/search controls, exact stock table, labelled movement facts, clear policy/reconciliation/form separation                                                         |
| Warehouse operations, stock counts, scanning    | Shared section spacing/form treatment; preserve all count and scanner controls, disclosure state and grant warnings                                                                |
| Storage locations                               | Grouped filters, shared heading and forms; hierarchy/source data unchanged                                                                                                         |
| Transfers                                       | Shared header and controls; labelled request, line, receipt and event facts including every discrepancy and reference                                                              |
| Purchasing, suppliers, receipts and returns     | Shared filters/forms/header; labelled quantities, costs, invoice due dates, return credits and movement references                                                                 |
| Supplier balances                               | Labelled currency totals and invoice balances; existing event pagination, payments and refund forms retained                                                                       |
| Customers and statements                        | Grouped selection/search; outstanding balance hierarchy and labelled receivable/payment/refund/credit facts                                                                        |
| POS and checkout                                | Shared heading and command layout; preserve product search/barcode, product cards, quantity controls, cart totals and state messages; native net/tax/total are separately labelled |
| Cash shifts and sale history/receipts           | Shared headers, history filters, labelled expected/counted/discrepancy values; existing receipt and correction actions retained                                                    |
| Reports and dashboard                           | Shared section heading, existing date controls, metric/table alignment and summaries retained; no new charts or metrics                                                            |
| Notifications and approvals                     | Shared heading, native spacing, consistent existing forms; all inbox and approval actions retained                                                                                 |
| Warehouse hierarchy                             | Shared heading and record spacing; existing hierarchy/stock list and optional real-data visualization retained                                                                     |
| Business trading                                | Shared heading/body/form treatment; original relationship and shared-order disclosures/history retained                                                                            |
| Accounting                                      | Shared heading/forms; labelled exact trial-balance currency/debit/credit facts; source posting, journal and period workflows retained                                              |
| Integrations and navigation help                | Shared heading and body spacing; provider availability and warning copy retained                                                                                                   |
| Business/access administration                  | Shared subsection headings, spaced location/member/audit rows and consistent forms; native audit facts labelled; policy/industry editor controls retained                          |
| Settings, appearance, security and connectivity | Existing dedicated Settings layout retained; shared security heading, policy form spacing; preferences remain in Settings and apply throughout                                     |
| Offline register and cash cart                  | Shared section/body spacing and existing command forms; grant, local pending, sync and conflict feedback retained verbatim                                                         |
| Developer showcase                              | Actual new common components demonstrated with isolated local values, no business mutations                                                                                        |

Native screens use the existing React Native controls and themed text; no DOM imports. Both native and web retain their platform-specific navigation. Windows uses the same Tauri frontend but requires Windows qualification; iOS native runtime likewise requires its own device/simulator verification.

## Presentation rules

Filters are grouped separately from transactional forms. Command forms use token spacing, a restrained border and clear submit placement; checkout confirmation remains prominent and touch-friendly. Definition lists wrap full identifiers instead of truncating money or stock quantities. Tables retain horizontal scrolling and existing pagination. Shared styles introduce no visibility, disclosure, disabled-state or motion overrides. User theme, density and text-size preferences continue through existing tokens/providers.

The application has no general chart engine, 3D visualization, custom calendar or drawer system to redesign. No fabricated analytics, payment-provider buttons or imagery were added. This pass does not claim new domain capabilities.

## Verification

Verified on 2026-10-21:

- `npm run validate`: PASS — formatting, foundation checks, dependency boundaries, lint, workspace typechecks, 14 tooling tests, 163 unit/component tests in 81 files, API and web production builds. Six source-length warnings remain (three pre-existing API files and the two warehouse controllers/report panel); no lint errors. Web retains its existing >500 kB chunk warning (main chunk about 522 kB uncompressed).
- `PLAYWRIGHT_CHANNEL=chrome npm run test:web:browser`: PASS — 17 browser tests, including accessible controls, dialogs, table/date/disclosure behavior, responsive sign-in, theme preferences and local showcase examples.
- `python3 /tmp/inventory-ui-workflows.py`: PASS — disposable local PostgreSQL, all 23 existing migrations applied, real API and Chrome, 19 workflow groups. The repository entry point is `tests/manual/organization.mjs` (requires `E2E_WEB_URL` and a disposable `E2E_INVITATION`). Includes account creation/recovery, organizational CRUD, product/pricing, inventory reconciliation, partial receipts/returns, transfers, customers/credit, failed and successful checkout, cash discrepancies, supplier payments/refunds, reports, approvals, exact journals and session isolation. Expected unauthorized/duplicate-conflict responses are exercised; authenticated localhost and 127.0.0.1 navigation had no unexpected 401s.
- New `tests/manual/screen-refinement.mjs`: PASS — all 16 permission-available workspace sections, light and dark, 320/768/1440 px, with WCAG A/AA checks. This found and fixed the Catalog pagination overflow at 320 px without removing actions. Existing POS checks additionally cover 390 px and preserve the cart across Settings navigation.
- Android 16 ARM64 emulator, Expo Go: real sign-in, dashboard, inventory balances, purchasing/customer controls, POS product lookup/add/remove, server quote (net USD 12.50, tax USD 0.00, total USD 12.50), and light/dark Settings exercised. Existing Design Review Store / Demo Store / Demo Warehouse and four demo products reused. DEMO-MUG lacked a selling price; its initial safe conflict state was verified, then a USD 12.50 test price was published through the existing pricing screen and the quote succeeded. No emulator sale was submitted; the local cart was cleared and light preference restored.
- `npm run build:mobile`: PASS — Android/iOS Hermes and web exports. This is JavaScript export evidence, not signed native packaging.
- Actual macOS WKWebView in an isolated temporary Tauri host: PASS — real login, prepared business, all 16 sections, live POS products, Settings and return to POS at 1100 px, without horizontal overflow. The host reused the production web bundle and was removed after validation. It did not replace the normal application's bridge or configuration.
- `npm run build -w @inventory/desktop -- --bundles app`: PASS — normal ARM64 `.app`, 11.57 MiB. Rebuilt and launched; binary checked to exclude temporary test hooks. No signing/notarization or installer qualification is implied.

Existing transaction assertions were updated to check labelled facts individually, retaining their exact quantities and large monetary strings; no validation was bypassed. A diff audit compared existing handlers, disabled states and control constraints in 53 modified components: no functional control-property changes (only new presentation values). Final follow-up formatting, foundation, lint/dependency checks passed; three focused screen/native component tests passed after switching the new native dimensions to canonical metrics. `git diff --check` passed. Existing unrelated workspace changes were preserved.

Screenshots are local artifacts under ignored `test-results/` (real-data web screens) and `/tmp/screens-android-*.png`. The actual source inventory is above; no existing top-level section was omitted from the browser audit. Native runtime checks cover representative workflows, not every action on every screen. Windows runtime/build was skipped on macOS; iOS runtime remains blocked by unavailable full Xcode/simulator tooling. Physical scanners/printers, screen-reader usability, signed releases, offline failure recovery on devices and broader browser coverage remain unqualified. No backend integration suite was rerun separately for this presentation-only change; real migrated-database browser workflows were run.

## Source-size review

The report panel remains just above the 200-line review threshold because its filters, permission-specific report selection, loading state and paginated result view are one controller. This pass changes only heading composition and retains that cohesive controller; extracting data behavior solely to satisfy line count would enlarge the requested scope. Existing warehouse controller exceptions remain unchanged in responsibility.
