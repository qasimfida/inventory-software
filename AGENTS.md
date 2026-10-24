# Agent instructions

Offline-first POS/inventory foundation. npm workspaces: React/Vite web, NestJS/PostgreSQL API, Tauri desktop, Expo React Native mobile. Implemented stages and capabilities are listed in [stage history](docs/development/stage-history.md). Native build/device coverage is limited; read [platform status](docs/architecture/platforms.md) before claiming support.

## Commands

`npm ci`; `npm run setup`; `npm run dev` (web + API with isolated local PostgreSQL); `npm run doctor`; `npm run dev:web`, `dev:api`, `dev:mobile`, `dev:desktop`; `npm run lint`, `typecheck`, `test`, `build`, `validate`.

- `build` covers shared packages, web and API. `build:mobile` exports native JS. `build:desktop` needs Rust/native tools.
- App builds prepare shared dependencies automatically. Web/desktop commands need a valid public API origin.
- Environment and database/native setup: [README](README.md).

## Architecture

- Apps consume `packages/contracts`, `packages/api-client` and portable `packages/domain`.
- Shared packages never import apps, UI or native/server runtime APIs.
- Web/desktop share DOM UI; mobile owns native UI.
- Add domain/device packages only for real use cases.

## Platform scope

- No explicit platform given: implement across every applicable supported platform (web, mobile, Windows, macOS). Inspect which are actually scaffolded. For a missing one, add its foundation only if in scope; otherwise report the blocker and follow-up.
- Explicit platform given: limit UI/device work to it. Still update shared domain, contracts, security, schemas and sync when necessary, and explain the impact. Don't add unrelated features elsewhere.
- Never silently skip a supported platform. Never claim unsupported platforms are complete.
- Parity rule: every feature and fix ships on web, desktop and mobile in the same change. Mobile uses native UI (no DOM reuse), with the same behavior, permissions, states and offline rules. A task isn't done until all three have it, or a blocker and follow-up are recorded in docs/product/gap-analysis.md. Exception: the public storefront is web-only; its management screens still ship on all three.
- First-launch qualification targets: web, Windows, macOS. Code parity is required everywhere, but only claim runtime support for platforms actually built and tested (see docs/architecture/platforms.md).

## Workflow

- Inspect existing implementations and follow data flow before editing. Preserve unrelated work.
- Follow [feature workflow](docs/development/feature-workflow.md): interpret → inspect → trace consumers → plan → implement → validate → report. Use an impact map for substantial changes.
- Follow [code standards](docs/development/code-standards.md). Target 100–150 lines per file; 200 is a review threshold, not a cap. Split by cohesion, record justified exceptions, avoid duplicate rules and unexplained dependencies.
- Audit or review tasks are read-only unless told otherwise.
- Don't commit. Never run destructive commands (rm -rf, git reset --hard, force push, data drops) without asking.
- Don't start new business features without a feature-specific request ([prompt template](docs/ai/feature-prompt-template.md)).

## Integrity and security (mandatory)

- Server authorization and transactional inventory/financial integrity are required.
- Never resolve inventory or financial conflicts with last-write-wins. "Locally saved" is distinct from "server-confirmed".
- All inventory changes go through LedgerCore. Purchasing and transfers own their document transitions.
- Generic transports make single-attempt mutations. Retry protected commands only with their existing stable IDs.
- Preserve account isolation, backend policy authority, notification access revalidation, owning-module approval commands and exact financial/ledger aggregates.
- Trading status never substitutes for stock/cash posting. Source journals never mutate source records.
- Never expose credentials. Never route secrets or unrestricted tenant data through the AI foundation (disabled provider, guarded navigation route, no SDK or action execution; see [AI foundation](docs/ai/provider-foundation.md)).
- Auth and session changes follow [authentication policy](docs/security/authentication.md): invitation onboarding, online server authorization, browser HttpOnly cookies, mobile secure storage, ephemeral desktop credentials, separately bounded encrypted offline cash grants.

## UI

- Tokens are canonical in `packages/design-tokens/tokens.css`. Regenerate native exports with `npm run build:shared`. Never hardcode colors, spacing, radii, font sizes or shadows. (added)
- Common UI changes need a real showcase example and [usage docs](docs/development/common-components.md). Ownership and native equivalents: [design system guide](docs/development/design-system.md).
- Auth screens and app screens use separate route layouts. Login success navigates to the dashboard route; never stack both on one page. (added)
- Every non-root screen has a history-aware, icon-based back button. (added)

## Known limits

External payment providers are disabled. Stage 6 has only a limited double-entry/source-posting foundation. Full statutory accounting, inventory valuation, 3D and historical profit valuation are unsupported or deferred. Supplier invoices, return credits and cash settlements form a scoped payable subledger only. No production-readiness claim without deployment and device qualification.

## Validation and reporting

- Run relevant available checks. Report exact results and which checks weren't run.
- Update documentation together with implementation. No fabricated tests or platform claims.

## Read only what the task needs

| Task | Guidance |
| --- | --- |
| System boundaries, stack, decisions | [Overview](docs/architecture/overview.md), [decisions](docs/architecture/decisions.md), [module map](docs/ai/architecture-map.md) |
| Platform coverage and adapters | [Platforms](docs/architecture/platforms.md) |
| Coding and review | [Standards](docs/development/code-standards.md), [workflow](docs/development/feature-workflow.md), [testing](docs/development/testing.md) |
| Stock or money | [Domain invariants](docs/domain/inventory-and-finance.md), [domain rollout](docs/development/domain-rollout.md), [Stage 3 workflows](docs/development/stage-3-workflows.md) |
| Offline or live updates | [Synchronization](docs/offline/synchronization.md), [offline rollout](docs/development/offline-rollout.md) |
| Commerce (credit, POS, shifts, receipts) | [Commerce rollout](docs/development/commerce-rollout.md) |
| Identity or tenant data | [Authorization](docs/security/authorization.md), [organization management](docs/development/organization-management.md) |
| Workspaces, scripts, deployment | [Workspace boundaries](docs/development/workspace-boundaries.md) |
| Settings, alerts, diagnostics | [Command 25A](docs/development/command-25a.md) |
| Reports, inbox, approvals | [Stage 5](docs/development/stage-5.md) |
| Trading, journals, releases | [Stage 6](docs/development/stage-6.md), [release operations](docs/development/release-operations.md) |
| Recovery, grants, cursors, outbox | [Stage 4](docs/development/stage-4.md) |
| New feature request | [Prompt template](docs/ai/feature-prompt-template.md) |