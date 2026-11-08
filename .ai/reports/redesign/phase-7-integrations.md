# Phase 7 — integrations

## Inspected and changed

Integrations only on `redesign/phase-7`; no commit or implementation tag. Inspected web/native panels and route consumers, shared client/contracts, integration controller, AI boundary and existing unit/integration tests. Unrelated working-tree changes preserved.

- Feature-local ProviderOverview uses compact, token-driven cards for Payments, Notifications and Navigation assistant. Server states become **Built-in only**, **Not configured** and **Enabled**; server detail remains intact. Enabled capability is explicitly not a live connection test.
- Permission-filtered navigation guidance is a distinct section with a meaningful empty state. No guessed route links or provider activation forms.
- Existing operator-owned configuration guidance remains clear; no credential inputs, secret fetching, external setup calls or promises of successful verification.
- Web title matches the shell, refresh uses the existing tooltip button, errors use read-only retry on both platforms, and assistant answers gain an accessible label/announcement.
- Assistant input remains visible only when AI is explicitly enabled, with original warning, max length, blank/busy disable, submission, answer clearing and reload behavior.

[Changed-file manifest](phase-7-integrations-changed-files.json); [route/state coverage](phase-7-integrations/routes.md). Only canonical guide changed: `docs/design-system.md`, DS-085. No shared primitive, dependency, API, schema, provider configuration, permission, transaction or settings changes. Compositions use existing primitives; the actual route and tests exercise them.

## Preserved boundaries

Characterization **before UI edits: 7 tests / 3 files passed**. Added coverage for business.read visibility, honest status validation, blank/oversized input before transport, single-attempt assistant requests and explanation-only output. Existing AI service/execution tests cover disabled providers, scoped navigation and restricted provider behavior using doubles.

No external payment or messaging provider added. No AI provider installed/enabled. Status endpoint and assistant still enforce authenticated business access; durable rate limits, post-provider reauthorization, strict output and safe logging remain unchanged. Navigation assistance cannot retrieve records or execute business actions. Native deferred opening remains intact.

## Verification

Logs and screenshots: `.ai/reports/redesign/phase-7-integrations-validation/`.

- `npx vitest run packages/api-client/src/integrations-characterization.test.ts packages/api-client/src/stage6.test.ts apps/web/src/features/integrations apps/mobile/src/integrations apps/api/src/ai/ai.test.ts apps/api/src/ai/execution.test.ts`: **23 tests / 6 files passed** (`tests-final.log`). Includes enabled/unconfigured controls, exact explicit POST, safe errors/recovery, empty guidance/status, text-only explanation and native deferred load.
- `npm run lint`: final **0 errors, 68 existing warnings**; boundaries passed (1319 modules/7514 dependencies). Initial test parameter naming violation corrected; guard unchanged.
- Scoped Prettier and `git diff --check`: passed; no whole-tree formatting rewrite.
- `node scripts/redesign-integrations-browser.mjs`: **12 viewport/theme cases passed**. Unavailable assistant stays hidden; refresh works; error/retry/recovery at1440. No external provider called.
- `redesign:inventory` / `check:redesign`: passed, 56 route rows and four canonical guides. `check:parity`: 41 shared routes, 45 web/45 native, 9 settings each. `audit:ui`: passed, 0 new groups, 5 improved groups, 6 existing review findings.

Chrome mock owner, fixed date, UTC/en-US, external HTTPS images blocked. Widths **390/844/1024/1280/1440/1920**, height390 at844 and900 otherwise; light/dark. No page exceptions or document overflow. Visually reviewed narrow dark provider cards and wide light overview. Mock payment state differs from real server local state; UI faithfully displays each supplied state, and tests cover local independently. Mock fixtures were not changed.

Final `npm run typecheck` passed (`typecheck-final.log`). `npm run build -w @inventory/api` passed; `npm run build -w @inventory/desktop -- --bundles app` built web production assets and the macOS app (12.53 MiB); `npm run build:mobile` exported Android/iOS/web. `check:foundation` passed: 62 documents, 1433 source files, existing source-size review warnings. Nine source/test/script/guide files changed. Final behavior-source diff was empty for the integrations client, contracts, controller and AI boundary.

## Performance

Existing development mock POS sentinel, not integrations latency or production INP: cold **254ms**; warm **121/63/197/53ms**, median **92ms**; search **367/393/449/394/443ms**, median **394ms**. Prior trading run: cold253ms, warm69ms, search392ms. Warm median +33% triggers review; samples remain variable and the current median is below the earlier reports run's136.5ms. Reviewed changes add only lazy integration presentation, with no POS data/query/debounce changes or new dependency. This does not establish a production regression or its cause; production timing remains unqualified.

Production assets: JS **1,730,079 raw / 531,684 gzip bytes**, 32 chunks; CSS **139,236 / 24,688**, 4 files; fonts **647,236 / 340,769**, 4 files. JS +3,016 raw bytes (~0.17%) from trading; CSS/fonts unchanged. Exact data: `bundles.json` and `performance.json` in the validation directory.

## Remaining qualification

- No `TEST_DATABASE_URL`: live integration/full repository suite not run. Real tenant denial, durable rate limits and post-provider permission changes are not newly proven against PostgreSQL.
- Enabled assistant tested with controlled component/service doubles only, not a live adapter. Empty service/navigation states are component-tested; demo transport has no integrations empty scenario.
- Windows host unavailable. Installed Tauri runtimes, signing/notarization and peripherals remain unverified. Browser responsiveness is not desktop runtime qualification.
- Native components/adapter tests do not qualify emulator/physical-device safe areas, keyboard or VoiceOver/TalkBack.
- Existing account/business switching and session lifecycle own sensitive-state clearing; no new cache or lifecycle rules. Exhaustive offline, denied access and preference combinations were not requalified.

Stop after integrations. No team/staff, notifications/logs or platform-admin work started.
