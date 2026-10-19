# Architecture decisions

Accepted means design commitment, not implemented functionality. Record future changes here with date, rationale, alternatives, and affected documents.

| ID / status              | Decision and rationale                                                                                                 | Alternative / revisit trigger                                                                                                         |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| D01 accepted, 2026-10-19 | npm with a lockfile; introduce npm workspaces when apps/packages exist. Empty repo has no package-manager constraint.  | Revisit only for demonstrated tooling limitations.                                                                                    |
| D02 accepted             | React/Vite/TypeScript, React Router, Tailwind, shadcn/ui for web/desktop. Fast client shell suits offline operation.   | Next.js only for separately justified SEO/server-rendered needs.                                                                      |
| D03 accepted             | NestJS modular monolith with PostgreSQL and REST. Transactions remain local and operations simple.                     | Service extraction only after independently measurable scaling or ownership need.                                                     |
| D04 accepted             | Pure shared domain/contracts; React state/reducers/context initially; TanStack Query for remote state when needed.     | Additional global state only when a concrete use case exceeds these tools.                                                            |
| D05 accepted             | IndexedDB web persistence and SQLite native direction, behind explicit ports; durable outbox and server idempotency.   | Libraries and encryption choices require platform proof first.                                                                        |
| D06 proposed             | Tauri for Windows/macOS, reusing web React UI.                                                                         | Electron if required printer/driver support or WebView constraints make Tauri unsuitable. Validate real devices, signing and updates. |
| D07 proposed             | React Native mobile; share domain/contracts/use cases, not DOM components.                                             | Capacitor or Tauri mobile if a hardware/offline prototype proves sufficient and UI reuse outweighs native needs.                      |
| D08 deferred             | ORM/query builder, runtime schema library, auth provider, native SQLite bindings, browser DB wrapper and test runners. | Choose compatible versions in the first relevant scaffold/feature; do not install speculatively.                                      |
| D09 deferred             | Socket.IO for invalidation hints only when required.                                                                   | Poll durable REST sync first; no socket-only correctness.                                                                             |
| D10 accepted             | Documentation tooling only now: pinned Prettier and dependency-free Node checker.                                      | ESLint/TypeScript/test/build configs land with executable applications and actual compatibility checks.                               |

## Evidence and limitations

- [Tauri process model](https://v2.tauri.app/concept/process-model/) uses different OS WebViews; this motivates independent Windows/macOS testing rather than assuming one browser result proves both.
- [IndexedDB transactions](https://developer.mozilla.org/en-US/docs/Web/API/IDBTransaction) provide transactional scopes but durability behavior varies. [Browser storage](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API) is subject to quotas/eviction; offline retention needs explicit qualification and recovery design.
- [PostgreSQL row security](https://www.postgresql.org/docs/current/ddl-rowsecurity.html) supports defense in depth, but privileged roles and table ownership need careful treatment. Application authorization remains required.

## Open product decisions

Before the relevant feature: offline authorization lifetime and revocation limits; oversell/backorder policy; offline checkout price acceptance; currencies, rounding and tax rules; supported mobile OS/device matrix; printer protocols; payment provider offline constraints; data retention and backup recovery objectives. Each unresolved decision must become an acceptance criterion or explicit blocker, never an implicit default for financial behavior.
