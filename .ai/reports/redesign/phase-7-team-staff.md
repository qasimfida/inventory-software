# Phase 7 — Team and staff

Scope: team-staff only. No commit, tag, dependency, API/schema, authorization or salary calculation changes. Existing unrelated work preserved.

## Inspected and reused

- Web /team: shell/WorkspaceScreens.tsx, organization/MemberCollection.tsx, MemberEditor.tsx, AccessFields.tsx and operations/OperationsPanel.tsx, StaffDetails.tsx (paths relative to apps/web/src/features except shell).
- Native: apps/mobile/src/organization/{MemberCollection,MemberEditor,AccessFields,ManagementPanel}.tsx and operations/{OperationsPanel,StaffDetails}.tsx.
- Shared: packages/api-client/src/{access-presentation,organization-model,organization,operation-forms,operations}.ts.
- Server: apps/api/src/organization/{organization.controller,membership.service}.ts and operations/{operations.controller,operations.service}.ts. Membership uses users.write; employment requires users.write and rejects store-scoped context.
- Invitation acceptance: /auth/invitation, web AuthPanel and shared auth client; existing trusted-operator invitations, no new credential-generation flow.
- Existing RecordCollection, RecordDetails, FormSheet/SidePanel, permission accordion, role controls, confirmation primitives and canonical preferences retained. No new shared UI primitive requires a showcase.

## Changes

- Web/desktop and native member collections now include warehouse scope. Unresolved store/warehouse identifiers remain explicitly labelled references instead of implying business-wide access.
- Member detail drawers use the established labelled metadata component, readable permission descriptions and explicit “No permissions assigned” for empty custom grants.
- Suspended memberships use warning tone; archived stays neutral and read-only.
- Assignment introduction explains account access separately from employment. Removed duplicate visible web editor legend, retained accessible legend and unchanged form fields.
- Staff detail panels use compact RecordDetails on both platforms. Web descriptions now explain actual panel purpose rather than suggesting read-only details must be saved.
- Existing list/grid, search/filter/export controls already follow the shared design and were reused.

## Coverage / behavior

| Surface                        | Actions and states                                                                    | Evidence / limitation                                                                                                                               |
| ------------------------------ | ------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| /team membership               | list/grid, email/role search, role/status filter, loaded export, assignment           | Existing RecordCollection; Chrome collection and assignment drawer checked at six widths, both themes. No bulk or account deletion invented.        |
| Member editor                  | role selection, store/warehouse assignment, custom permission groups, submit, pending | Characterization tests exercise actual POST payload and checked grants after collapsed groups; busy fieldset and native disabled controls retained. |
| Member details                 | read-only/archived, missing location names, empty custom grants                       | New UI and presentation regression tests; no unauthorized save/remove controls.                                                                     |
| Member removal                 | confirmation, archived state, version, original scope and grants                      | Original callback unchanged; last-owner guard remains server-owned. Not executed against a live database.                                           |
| /team staff                    | collection, search, filters, pagination, create/edit, active/inactive, salary command | Existing operations model/forms unchanged; details/edit-without-submission tested; Chrome staff drawer checked. No payroll calculations added.      |
| Access denied                  | users.read route, users.write commands, unscoped staff access                         | Existing guards retained; read-only characterization test. Full server tenant/role matrix not executed.                                             |
| /auth/invitation               | accept, validation, pending/error, link handling                                      | Existing route kept; auth/invitation tests pass. Real invitation delivery not tested.                                                               |
| /staff                         | compatibility route renders Expenses                                                  | Inspected; excluded from this team-only redesign. No expenses behavior changed.                                                                     |
| Loading/error/empty/no matches | existing organization and operations resource/collection states                       | Preserved; not every state injected in browser.                                                                                                     |
| Drafts and confirmations       | field names, schema validation, version checks, removal, salary                       | No changes to request construction or callbacks. No new unsaved-change interception.                                                                |

## Verification

- Before edits: 4 characterization files, 12 tests passed.
- After edits: 4 focused files, 15 tests passed; auth/invitation: 3 files, 10 tests passed.
- Full workspace TypeScript: passed.
- Web production and macOS Tauri app: built; .app 12.53 MiB.
- Expo Android/iOS/web exports: passed.
- UI audit: 0 new groups, 5 improved groups; 6 existing review findings.
- Parity: 41 shared routes, web/mobile 45 each, settings 9 each, passed.
- Additional broad test attempt: ManagementWorkflows has two stale “Catalog & pricing” navigation assertions; native ManagementPanel failed to import React Native Flow syntax under the root Vitest runner. These are not passing tests; unchanged and outside this presentation edit.
- TEST_DATABASE_URL is not configured. No real membership, invitation, salary or database integration writes tested.
- Browser screenshots and exact command logs: phase-7-team-staff-validation. Browser uses local demonstration transport, not production authorization proof.
- Windows not available. macOS installed runtime, signing/notarization and real native devices/emulators not verified. Native code/export parity is not device qualification.

## Remaining risks / next step

Review this module's screenshots and qualify real owner/read-only/custom/store-scoped accounts against a test database, including final-owner rejection, stale-version conflicts, pending/failure recovery and salary recording. Resolve the existing broad test harness/navigation failures separately. Do not advance to notifications/logs automatically.

## Files changed

- packages/api-client/src/access-presentation.ts
- packages/api-client/src/access-presentation.test.ts
- apps/web/src/features/organization/MemberCollection.tsx
- apps/web/src/features/organization/MemberEditor.tsx
- apps/web/src/features/operations/StaffDetails.tsx
- apps/mobile/src/organization/MemberCollection.tsx
- apps/mobile/src/organization/MemberEditor.tsx
- apps/mobile/src/operations/StaffDetails.tsx
- apps/web/src/features/organization/MemberEditor.test.tsx
- scripts/redesign-team-staff-browser.mjs
- .ai/reports/redesign/phase-7-team-staff.md

- Generated route/component coverage and validation artifacts refreshed. No files removed.
- Lint passed: 0 errors, 68 existing warnings; dependency boundaries passed (1,319 modules, 7,522 dependencies).
- Foundation passed: 62 documents, 1,434 source files.

- Route/docs check passed after regenerating coverage: 56 route rows, four canonical guides.
- Browser: 12 cases at 390, 844, 1024, 1280, 1440 and 1920px, light/dark; no runtime page errors. Assignment and staff detail drawers checked. Screenshots inspected at 390px light and 1440px dark.
- Performance smoke: cold POS 260ms, warm median 127ms, search median 407ms. Warm median increased from prior 92ms; samples vary 58–199ms. No POS code changed. This noisy development measurement needs a stable production benchmark before a performance claim.
- Scoped diff whitespace check passed; no dependencies added.
