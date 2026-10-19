# Mandatory feature workflow

1. **Interpret.** Define behavior and acceptance criteria; apply root platform scope rules. Identify domains, permissions, dependencies, behavior changes and meaningful unknowns. Ask only what inspection/documentation cannot answer.
2. **Inspect.** Search implementation content, not only filenames. Read routes/components, hooks/services, schemas/migrations, API contracts, publishers/subscribers, caches, local storage/outbox, tests and platform adapters. Follow real data flow and find all consumers before editing.
3. **Map impact.** For non-trivial work, record the chain below and its actual files. Mark absent layers explicitly; do not invent them. Distinguish necessary shared changes from unrelated modules.
4. **Plan.** List files, reusable logic, platform adapters/UI, migrations/API compatibility, offline effects, checks and acceptance criteria. A small change needs only a brief plan.
5. **Implement.** Extend existing patterns; explain new libraries/abstractions. Keep scope to requested behavior and dependencies. Update contracts, migrations, tests and documents as needed.
6. **Validate.** Run available relevant formatting, lint, type, unit/integration/E2E, build and platform checks. Exercise failure paths for persistence, inventory, finance and sync. Never claim an unavailable or unrun check passed.
7. **Review.** Inspect the diff for regressions, duplicated logic, security issues, unrelated changes and unnecessary complexity; update affected documentation.
8. **Report.** State changes/files, affected consumers, implemented and verified platforms separately, exact checks/results, limitations and follow-up blockers.

## Impact map template

| Layer                                       | Existing files/consumers | Change and acceptance evidence |
| ------------------------------------------- | ------------------------ | ------------------------------ |
| Authoritative source / owning module        |                          |                                |
| Transaction / schema / permissions          |                          |                                |
| REST contracts / publishers / subscriptions |                          |                                |
| Local persistence / outbox / recovery       |                          |                                |
| Cache / projections / all UI consumers      |                          |                                |
| Web / mobile / Windows / macOS adapters     |                          |                                |
| Tests / docs / rollout                      |                          |                                |

For live pricing, trace catalog mutation and committed price versions, publisher authorization, payload validation/versioning, each subscription, product search/detail, cart, checkout, purchasing/inventory price consumers where present, query invalidation, local projections, reconnect and offline behavior on applicable platforms. Checkout must still validate prices server-side; receiving a socket event is not proof of correctness.

## Documentation maintenance

Change ownership/dependencies → update the module map. Change architecture → record a decision and update the affected specialized guide. Add/verify a platform → update platform status. Add commands/environment setup → update README and testing. Change invariants, sync or permissions → update the respective canonical document. Keep AGENTS concise and reference detailed policies instead of duplicating them.
