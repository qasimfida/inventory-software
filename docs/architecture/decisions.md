# Architecture decisions

Accepted means design commitment, not implemented functionality. Record future changes here with date, rationale, alternatives, and affected documents.

| ID / status               | Decision and rationale                                                                                                                                                                | Alternative / revisit trigger                                                                                                         |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| D01 accepted, 2026-10-19  | npm with a lockfile; introduce npm workspaces when apps/packages exist. Empty repo has no package-manager constraint.                                                                 | Revisit only for demonstrated tooling limitations.                                                                                    |
| D02 accepted              | React/Vite/TypeScript, React Router, Tailwind, shadcn/ui for web/desktop. Fast client shell suits offline operation.                                                                  | Next.js only for separately justified SEO/server-rendered needs.                                                                      |
| D03 accepted              | NestJS modular monolith with PostgreSQL and REST. Transactions remain local and operations simple.                                                                                    | Service extraction only after independently measurable scaling or ownership need.                                                     |
| D04 accepted              | Pure shared domain/contracts; React state/reducers/context initially; TanStack Query for remote state when needed.                                                                    | Additional global state only when a concrete use case exceeds these tools.                                                            |
| D05 accepted              | IndexedDB web persistence and SQLite native direction, behind explicit ports; durable outbox and server idempotency.                                                                  | Libraries and encryption choices require platform proof first.                                                                        |
| D06 accepted for scaffold | Tauri 2 for Windows/macOS, reusing web React UI; native qualification pending.                                                                                                        | Electron if required printer/driver support or WebView constraints make Tauri unsuitable. Validate real devices, signing and updates. |
| D07 accepted for scaffold | Expo SDK 58 / React Native 0.88 mobile; share contracts and transport, not DOM components.                                                                                            | Capacitor or Tauri mobile if a hardware/offline prototype proves sufficient and UI reuse outweighs native needs.                      |
| D08 deferred              | External identity provider and optional ORM remain deferred. Expo SQLite, bundled rusqlite, native IndexedDB transactions and noble AES/PBKDF2 are selected for bounded offline cash. | Choose compatible versions in the first relevant scaffold/feature; do not install speculatively.                                      |
| D09 deferred              | Socket.IO for invalidation hints only when required.                                                                                                                                  | Poll durable REST sync first; no socket-only correctness.                                                                             |
| D10 accepted              | Superseded: documentation-only tooling expanded by Command 1 to ESLint, strict TS, tests and builds.                                                                                  | ESLint/TypeScript/test/build configs land with executable applications and actual compatibility checks.                               |

## Evidence and limitations

- [Tauri process model](https://v2.tauri.app/concept/process-model/) uses different OS WebViews; this motivates independent Windows/macOS testing rather than assuming one browser result proves both.
- [IndexedDB transactions](https://developer.mozilla.org/en-US/docs/Web/API/IDBTransaction) provide transactional scopes but durability behavior varies. [Browser storage](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API) is subject to quotas/eviction; offline retention needs explicit qualification and recovery design.
- [PostgreSQL row security](https://www.postgresql.org/docs/current/ddl-rowsecurity.html) supports defense in depth, but privileged roles and table ownership need careful treatment. Application authorization remains required.

## Open product decisions

Before the relevant feature: offline authorization lifetime and revocation limits; oversell/backorder policy; offline checkout price acceptance; currencies, rounding and tax rules; supported mobile OS/device matrix; printer protocols; payment provider offline constraints; data retention and backup recovery objectives. Each unresolved decision must become an acceptance criterion or explicit blocker, never an implicit default for financial behavior.

## Command 1 decisions — 2026-10-19

- npm workspaces are sufficient; no orchestration service, container, deployment or CI provider added. Shared packages compile to ESM JS plus declarations, usable by Node, Vite and Metro. Command 2 adds lifecycle hooks so standalone app builds prepare them automatically.
- Only `contracts` and `api-client` are needed today. Zod 4 schemas live with contracts; no separate validation/domain/config/test-utils packages without real consumers.
- NestJS 12 uses explicit dependency injection, environment validation, class-validator request validation, consistent safe errors, JSON logs, Helmet and allowlisted CORS. `pg` + `node-pg-migrate` avoids choosing an ORM before business schema exists.
- React 19.3.0 is aligned across web and Expo 58's declared React Native 0.88 compatibility. TypeScript 6.0.3 fits Expo and typescript-eslint's `<6.1` peer constraint; latest TypeScript 7 is deliberately not selected.
- ESLint 9.39.5 is temporarily retained because the JSX accessibility plugin declares support through ESLint 9. npm marks ESLint 9 unsupported. Track compatible plugin/ESLint upgrades; do not suppress peer conflicts to force ESLint 10.
- The 200-line rule is now a review warning per the new user instruction, with documented exceptions; avoid artificial splits.
- Hash routing allows the same web shell to work in packaged desktop files. Health checks use React state and explicit transport calls; TanStack Query and sockets are not needed yet.
- Native integrations are feasible extension paths, not proven device support. See [platform assessment](../platforms/setup.md) and [validation status](../development/validation-status.md).

## Command 2 audit corrections — 2026-10-19

- Keep npm and existing framework majors; update Expo from 58.0.14 to 58.0.16 because its compatibility check requires that SDK 58 patch. Remove unused direct contracts dependencies from web/mobile, which consume contracts through api-client. Declare the Vite tooling type dependency and Node globals lint dependency explicitly.
- Build hooks compile contracts before api-client, and shared packages before application builds/development. Avoid introducing a build orchestrator for two small shared packages.
- Dependency-cruiser now includes external edges without traversing external implementations, resolves workspace imports to source for architecture analysis, and rejects both bare and prefixed Node builtins. Negative tests verify the rules rather than inferring enforcement from a clean graph.
- Tauri compile-time icons are now real build inputs generated from a simple SVG; only required desktop assets are retained. Native compilation still requires Cargo.
- Mobile TypeScript inherits the root strict policy alongside Expo defaults. Vitest discovers TSX tests and uses the same web alias; JavaScript tooling now receives ESLint recommended rules.
- Public API origins use the shared Zod URL parser. Web/desktop startup/build validates environment configuration; backend CORS normalizes equivalent origins. Parser failures retain safe HTTP status codes and all missing-route variants use JSON envelopes.
- See [audit findings and exact evidence](../development/foundation-audit.md). Native binaries, hardware support and the upstream dependency findings remain separate blockers.

## Command 3 workspace boundaries — 2026-10-19

- Each workspace has independent development, test, lint, type-check and build commands. Native desktop checks remain host-dependent and separate from portable validation.
- API packaging includes only API/contracts runtime artifacts and a pruned dependency lock; deployment does not install client toolchains.
- Local environment files, injected test fixtures and explicit production environment inputs are separate. Production client commands require HTTPS origins.
- Boundary probes run in temporary fixtures. Shared dependencies use an explicit allowlist; UI/native implementations remain app-owned. See [workspace boundaries](../development/workspace-boundaries.md).

## Command 6 authentication — 2026-10-19

- Use manual invitation onboarding and PostgreSQL-backed opaque sessions, with established scrypt password hashing. No identity-provider credentials, email verification claims, default users or business memberships.
- Use HttpOnly same-site cookies on web, Expo SecureStore on mobile and ephemeral memory credentials on desktop. Persistent desktop login is intentionally unsupported until an OS vault adapter is qualified.
- Restore direct contracts dependencies in web/mobile because authentication now consumes their Session types. Add Expo SecureStore only to the mobile workspace, with its supported config plugin.
- Keep offline authentication locked until a separately reviewed bounded permission/cache design exists. See [authentication policy](../security/authentication.md).

## Organization management (Command 7)

Implemented exclusive business ownership, account-based owner/manager/viewer memberships and store-bound warehouses/terminals. Branches use the store entity. Role/lifecycle transitions serialize on the business row and use optimistic record versions; all changes append transactional audit events. Web/desktop and native mobile share contracts and in-memory coordination, not UI frameworks. No new dependencies, offline persistence or product tables. [Organization management](../development/organization-management.md) records the permission matrix, assignment flow, explicit RLS deferral and validation limits.
