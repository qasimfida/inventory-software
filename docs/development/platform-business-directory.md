# Registered business directory

Platform overview links to `/#/admin/businesses` (native path `/admin/businesses`). It replaces the daily registration list with a dedicated search/filter/list/grid directory. Counts on overview retain their existing aggregate sources.

Both protected GET routes live under `/api/v1/auth/security/platform/businesses`: the collection accepts validated `search`, `state` and `offset`; `/:id` accepts a UUID and independent location `offset`. Every request revalidates platform-administrator authority within a transaction. An ordinary business owner, manager or viewer cannot use them, even for a business they belong to. No membership or account details are returned. There is no schema migration or tenant permission change.

Business and location pages each contain at most 25 records. Names are searched as escaped literal text. Business rows initially hide their stores and warehouses; expanding a row fetches only that business's locations. Selecting a name opens a read-only detail drawer. Existing list-loading preferences determine pagination versus incremental loading; a failed read displays retry feedback. A location detail describes its parent store by identifier. Terminals and cross-business operational data are outside this directory.

**Add business** uses the existing validated organization creation command, including initial owner membership and audit event. It does not bypass onboarding or issue new credentials. The UI guards duplicate local submission; failed mutations are not automatically retried. A successful create refreshes registrations and membership choices without changing the active workspace. As before, an uncertain network response may require checking registrations before retrying; this command has no new idempotency contract.

Web and Tauri use shared Vaul drawers and Radix controls. React Native uses native panels, accessible lists/cards and safe-area scrolling. This directory is online-only; it does not claim platform-wide data is available from an offline business grant. Test evidence is in [shell/directory QA](../qa/shell-business-directory/report.md).
