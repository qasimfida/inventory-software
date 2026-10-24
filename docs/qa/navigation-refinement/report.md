# Navigation and workflow refinement — 2026-10-21

## Implemented

- Moved the sidebar toggle into the content toolbar, removed the header profile menu and duplicate
  page heading, added chevron section accordions, and replaced the workspace drawer with an
  anchored shadcn-style team menu. Collapsing the rail retains section expansion choices.
- Added authorized multi-store/warehouse selection within a business. Dashboard and inventory
  overview aggregate selected warehouses; stock/checkout mutations still require one location.
- Theme controls expose Light/Dark/System and the existing semantic palette. Header popup opens
  left; sidebar submenu opens right with collision handling. Connectivity uses cloud status icons.
- Settings navigation is a top tab-style route row. Preferences are grouped by appearance,
  typography, layout/controls, regional and accessibility/performance settings.
- Added Company profile at `/settings/company`: display/legal name, contact/address/website,
  description, logo and brand palette. Existing business policy/version/audit/permissions own the data.
- POS filters sit beside product search. Customer suggestions offer a permission-guarded Add customer
  sheet, including empty results. Customers have server-side state/currency filters and list/grid views.
- Dynamic selects use searchable cmdk/Radix popovers with the existing native form adapter. Add/edit
  product and shared command forms use right sheets. Native clients use searchable native panels.
- Catalog, inventory and customers have local loaded-record selection. Low-stock and out-of-stock
  badges use distinct warning/error surfaces. Genuine loading states use unmeasured progress bars.
- Updated the actual component showcase and common-component API documentation. Native equivalents
  reuse semantic tokens and domain contracts without importing DOM components.

## Evidence

| Check                                                                   | Result                                                                                                                                                                                          |
| ----------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run typecheck`                                                     | Passed across shared packages, API, web, mobile and root test/tooling types                                                                                                                     |
| `npm test`                                                              | 14 tooling tests and 205 Vitest tests across 99 files passed                                                                                                                                    |
| PostgreSQL integration                                                  | 3 new navigation/settings/customer tests, 2 dashboard tests and 3 stock-overview tests passed (8 distinct tests)                                                                                |
| `PLAYWRIGHT_CHANNEL=chrome npm run test:web:browser`                    | 24 passed; themes, preferences, keyboard behavior, dialogs, form adapters, disclosures and responsive component coverage                                                                        |
| `node tests/manual/navigation-refinement.mjs`                           | Six journeys: 390/768/1440 × light/dark; POS filters/customer sheet, inventory selection, customer grid, company tabs; no page errors; company-page axe checks report zero WCAG A/AA violations |
| `node tests/manual/navigation-menus.mjs`                                | Workspace multi-selection, sidebar collapse/restore, keyboard theme submenu and header theme popup passed                                                                                       |
| `python3 tests/manual/navigation-native.py`                             | Android emulator walkthrough passed with isolated development fixtures                                                                                                                          |
| `npm run lint`                                                          | Zero errors; 23 source-length warnings with existing/new review rationales; no dependency-boundary violations                                                                                   |
| `npm run check:foundation`                                              | Passed (71 documents / 868 source files at execution)                                                                                                                                           |
| `npm run format:check`                                                  | Task files pass; only the pre-existing user-edited `AGENTS.md` remains unformatted                                                                                                              |
| `npm run build`                                                         | API and web production builds passed                                                                                                                                                            |
| `npm run build:mobile`                                                  | Android/iOS JavaScript and web exports passed                                                                                                                                                   |
| `npm run build -w @inventory/desktop -- --bundles app`                  | macOS ARM64 `.app` built; 12.20 MiB                                                                                                                                                             |
| `cargo test --locked --manifest-path apps/desktop/src-tauri/Cargo.toml` | 2 passed                                                                                                                                                                                        |
| `git diff --check`                                                      | Passed                                                                                                                                                                                          |

Database fixtures run all existing migrations twice against isolated databases. No migration was
needed for the existing policy JSON. Databases were retained under the repository's cleanup rule;
see [registry](../retained-test-databases.json). The new tests cover denied profile writes, tenant
boundaries, stale policy versions, unsafe logo formats, customer filtering, malformed input,
warehouse membership scope, exact aggregate stock and ledger reconciliation.

Regression checks found and corrected: accordion draft unmounting, a stale native-details adjustment
link, sheet focus return, a collapsed rail overlap, and a literal whitespace node inside the native filter panel. Tests were
updated for the intentional trigger-to-sheet presentation; original value/validation assertions remain.

## Platform verification and limits

- Chrome: actual mock application at 390, 768 and 1440 pixels in light/dark; automated component
  checks also cover 320px and 200% text. See [results](browser-results.json),
  [workspace menu](workspace-menu.png), [sidebar theme](sidebar-theme.png),
  [inventory](inventory-1440-dark.png), [company](company-1440-light.png).
- Android: Android 16 ARM64 emulator, Expo Go 58, 1080×2400 at density 420. Login, workspace
  selection panel, POS filter panel, searchable category options, profile menu, theme/palette and
  preferences, company profile and customer grid exercised. See [results](android-results.json) and [filters](android-pos-filters.png).
- macOS: the real packaged Tauri app launched at 1100×760 logical size and its dark sign-in screen
  was visually checked. An initial blank capture resolved after activation/repaint; no application
  change was required for that transient capture. See [launch](macos-1100.png). Authenticated native
  WebView workflows were not rerun; corresponding React workflows have the Chrome evidence above.
- Windows: no Windows host. iOS: no full Xcode/simulator. Native behavior remains unverified;
  successful iOS JavaScript export is not a native build or device certification.

UI walkthroughs use marked development fixtures and do not mutate real inventory, sales or payments.
Real API/database tests separately verify the new data boundaries. Camera scanning, printers, native
logo-picker permissions, screen readers, code signing and production distribution were not qualified.
The optional WebKit production smoke rendered sign-in; its separate preview origin was not API-CORS
allowlisted, so authenticated preview requests were not considered verified.

Multi-location query lists are bounded to 100 active warehouse IDs and never combine businesses.
Other operational screens retain individual location selection from the chosen scope. Local record
selection does not implement a bulk financial command. Logo files are limited to 60 KB PNG/JPEG/WebP;
there is no remote image fetch, image editor or brand-asset service. Business display details do not
change transaction identity. User preferences retain precedence over business defaults unless policy
explicitly enforces a value.

The working tree already contained extensive earlier-stage work. This task reviewed its own
navigation, presentation, settings and authorized read-filter changes without reverting unrelated work.
Ledger/checkout calculations, authentication, native storage and payment integrations were preserved.
