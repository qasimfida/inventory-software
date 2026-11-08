Follow AGENTS.md. Don't commit. Applies to every feature prompt.

Method
1. Inspect first: relevant code on every platform, modules to reuse, permissions, existing tests. Never assume a capability is missing because it's absent from one file.
2. Design before code: write .ai/reports/features/<name>-design.md (data model, API, permissions, state machine, platform UX, risks, reuse list, options considered with a recommendation). STOP and present the decision checkpoints. Implement only after I approve.
3. Implement, verify, report.

Rules
- Reuse existing modules (price/quote resolver, LedgerCore, journals, customer credit, receipts, permissions, settings, sync). No parallel systems.
- The server computes money, tax, discounts, totals and stock effects. Clients collect input and display. Every command is idempotent with stable IDs.
- Migrations are forward-only, backfill existing data, lose nothing, with a documented rollback.
- New permissions get role defaults, server enforcement, UI gating, tenant and store/location scope, and audit entries.
- All platforms (web, desktop/Tauri, mobile native) in the same change, or record a blocker. Shared components and design tokens only; the design check must pass; respect Preferences (theme, density, control size, motion).
- States on every screen: loading, empty, no results, error, permission denied, offline, pending, success, destructive confirmation, validation, unsaved changes.
- Mock data and scenarios for every new screen.
- Tests: unit (calculations, state machines), API integration (permissions, tenant isolation, idempotency, concurrency), component tests, Playwright flows on web, mobile tests where tooling exists, parity check.
- Update the four docs (rules only, with IDs and enforcement tags). Remaining work goes into my report for the tracker.
- Run lint, typecheck, tests, build. Report exact results and what couldn't run.