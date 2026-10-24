# Business directory and compact preferences

## Scope and impact

- Reuse `/admin/businesses` on web/Tauri and native navigation: cancellable search,
  status filtering, bounded server pagination, list/grid switching and the existing
  Add business drawer. Global registration access remains platform-admin-only.
- Overview keeps the actual registration chart and one View all businesses link.
  Removed the daily-figures accordion; exact chart counts remain in its accessible
  description. No fabricated chart values.
- `BusinessDirectory` → `BusinessLocations` → new feature-local
  `BusinessLocationCards`: list rows lazily load nested tables; grid details use
  separate stores/branches and warehouse cards. Location details still open in the
  existing drawer. Native uses equivalent grouped cards instead of DOM tables.
- Compact settings navigation and preference segments use the existing typography,
  radius and spacing tokens. Selected circle styling now also reaches segmented
  preference options. Showcase updated to render the actual settings tab classes.
- Backend, schemas, permissions, contracts, money/stock, outbox and preference
  persistence are unchanged. Existing API reads still fetch at most 25 locations
  at a time and retain pagination/scroll-to-load behavior.

## Verification

- `npm run typecheck`: passed; final direct web/native TypeScript checks also passed.
- `npm test`: 223 tests and 14 tooling checks passed before the last chart tests
  were added. Final `npx vitest run`: **225 tests / 107 files passed**.
- `PLAYWRIGHT_CHANNEL=chrome npx playwright test`: **24 passed**. The first run
  had 23 passes and one timing failure measuring a not-yet-visible showcase table;
  that test now waits for visibility before measuring dimensions.
- `npm run lint`: **0 errors, 23 existing source-length warnings**; dependency
  boundaries passed (892 modules / 4,714 dependencies). Final targeted ESLint passed.
- `npm run build`, `npm run build:mobile`, and
  `npm run build:desktop -- -- --bundles app`: passed. Mobile is an Android/iOS/web
  JavaScript export, not signed native release qualification.
- `npm run check:foundation`: passed (83 documents / 933 source files).
- `npm run format:check`: existing user-maintained `AGENTS.md` formatting remains;
  task files are formatted. `git diff --check`: passed.
- Custom Chrome walkthrough: overview chart and single directory link, live local
  demo search, archived-status empty result, Add business drawer, nested tables,
  grouped grid cards and detail drawers. Rounded/circle at **1440, 768, 390px**:
  correct radii and no horizontal page overflow; no browser runtime errors.
  See `browser-results.json` and the adjacent screenshots.
- **Android 16 ARM64 / Expo Go, 1080×2400**: local PostgreSQL API login, directory
  navigation, actual nested locations, grouped grid cards, location details,
  settings tab scrolling, preferences popup and logout passed. The first automation
  attempt used an obsolete expansion label; grid now consistently says View locations,
  and the updated walkthrough passed. See `android-directory-results.json`.
- **macOS ARM64**: rebuilt and launched the Tauri app, inspected its sign-in screen
  at 1100×760 logical pixels (`macos-launch.png`). Authenticated directory flows
  were verified in Chrome and Android, not the native macOS WebView.

## Limits and review

Windows runtime/build and iOS simulator runtime were unavailable; their platform
behavior is not claimed verified. Business creation was checked through its form
entry, without submitting a new registration in this pass. Database integration
suites were not rerun because this task changes no API, schema or transaction code.
Existing backend authority and directory scope remain intact. No new migration,
dependency, account reset or production data mutation. Review was limited to the
files touched for this request; unrelated existing workspace changes were preserved.

Feature-owned cards live beside the existing directory in each app. Shared tab
behavior is documented in `docs/development/common-components.md` and demonstrated
at `/#/design-system`; no new shared package or duplicate directory route was added.
