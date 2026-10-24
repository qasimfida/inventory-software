# Implemented stage history

This index preserves the canonical rollout documents and their explicit limitations.

- [Foundation and workspace boundaries](workspace-boundaries.md): independent API, React web, Expo mobile, Tauri desktop and portable packages.
- [Organization and access](organization-management.md), [authentication policy](../security/authentication.md), [authorization](../security/authorization.md).
- [Domain rollout](domain-rollout.md), [commerce rollout](commerce-rollout.md), [Stage 3 workflows](stage-3-workflows.md): ledger, purchasing, transfers, credit, cash checkout and corrections.
- [Offline rollout](offline-rollout.md): bounded encrypted cash grants, outbox, revision notifications, stock counts and scanning.
- [Stage 3.5](stage-3-5.md): shared tokens, native conventions and disabled AI foundation.
- [Stage 4](stage-4.md): recovery, grant revocation, cursor and outbox hardening.
- [Command 25A](command-25a.md): account preferences, policies, auditing, alerts and diagnostics.
- [Stage 5](stage-5.md): permission-scoped reports, configuration, approvals and optional warehouse hierarchy.
- [Stage 6](stage-6.md): controlled trading, limited journals, guarded integrations. External payments, statutory accounting, inventory valuation and 3D remain unsupported.
- [Final UI audit](final-ui-audit.md): prior design-system refinements and their historical evidence.
- Routed shell and development fixtures: [route inventory](../routes.md), [mock-data scope](mock-data.md), [deep links](../deep-linking.md), [current QA report](../qa/report.md). Prior test results are historical and do not replace verification of this change.

## Visual QA refinement — 2026-10-24

Reused routed shells, scoped mock data and existing design primitives. Business switching moved from chrome into Business settings on DOM/native; headers identify routes, desktop profile opens upward, inventory has initial loading feedback, long exact amounts wrap at enlarged text, and missing staff/cost fixtures were added. Native inventory action triggers no longer nest buttons; empty staff/cost errors no longer render text directly under View. Packaged desktop image sources now use explicit HTTPS origins rather than all HTTPS hosts. See [current QA evidence and limitations](../qa/report.md); this is not production qualification.
