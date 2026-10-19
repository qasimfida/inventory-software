# Code standards

## Structure and naming

Target 100–150 physical lines per source file, with 200 lines as a review threshold, not an absolute cap. Split by responsibility, not arbitrary line counts. Generated code, lockfiles and migrations can be exempt; any other exception requires a review rationale and decomposition proposal. Register exact source paths and reasons in `scripts/source-size-exceptions.json`; stale exceptions fail validation. Documentation is not source code.

| Item                      | Convention                                                               |
| ------------------------- | ------------------------------------------------------------------------ |
| React components / files  | PascalCase / `ProductSearch.tsx`                                         |
| Hooks                     | camelCase, `use` prefix, e.g. `useProductSearch.ts`                      |
| Functions / variables     | Descriptive camelCase                                                    |
| Types / interfaces        | PascalCase                                                               |
| True constants            | UPPER_SNAKE_CASE when appropriate                                        |
| Domain directories        | Descriptive kebab-case, consistent with module ownership                 |
| Database tables / columns | snake_case                                                               |
| REST routes               | Versioned plural kebab-case resources; explicit commands for transitions |
| Tests                     | `.test.ts` / `.test.tsx`; platform-native equivalent documented locally  |

Prefer named exports. Default exports require framework/tooling justification. Avoid vague utility dumps, `any`, unsafe casts, deep nesting, and large service classes. Parse unknown input at boundaries; share runtime contract schemas instead of trusting TypeScript at runtime. Use explicit time zones, decimal arithmetic and currency/unit types for business values.

Use `@/` only for an application's own source; configure it consistently in TypeScript, bundler and test runner. Shared code uses explicit workspace package exports. Prefer direct module imports internally; boundary-only barrels may expose intentional public APIs. Never use barrels to bypass ownership or create circular imports.

## Components and state

`apps/web/src/components/ui` is for generated shadcn/ui standard primitives (buttons, inputs, dialogs, menus, tables). Prefer composition, variants and theme changes over casual generated-file edits. Record necessary upstream deviations.

`components/common` is for truly reusable customized application components, such as MoneyDisplay or BarcodeInput, once needed. `features/<feature>/components`, `hooks`, `services`, and optional `types` keep feature-owned logic local. Do not implement these examples preemptively or move all components into common. Native mobile uses corresponding native primitives.

Keep rendering separate from domain and persistence. Use React state/reducers/context for local UI state and TanStack Query only for remote/server state when needed. Durable local data/outbox must not live only in React state or a query cache.

## Tooling contract

Current executable checks: Prettier, ESLint with TypeScript-aware promise rules, React Hooks/DOM accessibility rules, dependency-cruiser, strict type checks, Vitest, builds and the foundation checker. Root configs are shared; app configs select runtime-specific libraries.

Maintain ESLint flat configuration with TypeScript-aware analysis, unused imports/variables, consistent type imports/naming, React/React Hooks rules for React code, JSX accessibility for DOM code, and resolved import-cycle/module-boundary checks. Configure platform-specific rules without applying DOM rules to native files. Do not weaken rules to hide failures; document narrowly scoped exceptions.

TypeScript must enable `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noImplicitOverride`, `noUnusedLocals` and `noUnusedParameters`. Choose module/target settings per Node, browser, and native toolchain. Keep domain free of DOM/native globals. Verify aliases and package exports in tests and builds.

Use Prettier as the sole formatting authority; do not duplicate conflicting ESLint formatting rules. Follow the script contract in [testing](testing.md). CI provider setup is deferred under Command 1 scope; use these same checks when authorized. Lock dependency versions; review package necessity, bundle cost, license and platform compatibility before installation.

## Review gate

- Correct behavior and actual impacted consumers/platforms covered; unrelated work preserved.
- Ownership, public interfaces and imports follow the module map; no duplicated business rules.
- Tenant access, transactions, precision, idempotency and offline status meet relevant policies.
- Focused files, meaningful tests, accessibility and bundle impact reviewed.
- Schema/contract compatibility, recovery and rollout addressed where relevant.
- Exact checks, unsupported platforms, source-size exceptions and documentation changes reported.
