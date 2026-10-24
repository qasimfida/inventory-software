# Staff navigation and record details

## Changes and impact

| Layer                       | Change                                                                                                                                                                                                                                                                                 |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Shared navigation           | `/staff` (Staff & expenses) and `/team` (Team & permissions) appear under Administration, outside Settings. Existing users.write/users.read visibility checks remain.                                                                                                                  |
| Web / Tauri                 | Old settings URLs redirect to the new destinations; navigation links updated. Staff names open a details drawer with all stored fields, optional inline editing and an account-access link.                                                                                            |
| React Native                | Equivalent routes, native details panel and edit controls; old navigation targets normalize to their new routes.                                                                                                                                                                       |
| Shared web tables           | Record title links underline on hover; row-header buttons also underline with keyboard focus. Existing showcase RecordCollection demonstrates this behavior.                                                                                                                           |
| Empty selection             | No new selection state introduced. Existing SearchControl hides its X when empty; regression assertions cover initial and cleared state. Drawer close buttons remain available.                                                                                                        |
| API / persistence / offline | Unchanged. Existing membership editor controls roles, custom permissions, active/suspended/archived access and store/warehouse scope. Staff payroll records have no account foreign key, so account access is edited explicitly in Team & permissions rather than inferred from names. |

## Verification

- 264 unit/component tests passed across 123 files, including staff drawer, access navigation, role visibility and empty-search controls.
- 14 tooling tests passed.
- Full workspace typecheck passed after removing a leftover native SettingsScreen reference; subsequent web/native type checks also passed.
- Lint: zero errors, 33 existing file-size warnings; dependency boundaries passed.
- API/web production build, Android/iOS/web Metro export and macOS Tauri `.app` build passed.
- Chrome with the real local API: owner login, legacy staff URL redirect, title hover underline, drawer information, prefilled staff editor, membership editor access, settings tab removal. No mutations were submitted. No runtime errors recorded.
- Staff page checked at 390, 768 and 1440px widths with no document overflow. See `browser.json` and `details.png`.
- Android emulator: cashier shell and More navigation inspected; management entries absent from the visible navigation. Owner staff-drawer interaction was not exercised on-device.
- Integration: operations suite passed; organization permissions suite passed 3 of 4 cases. One existing expectation at `apps/api/src/organization/permissions.integration.test.ts:54` rejects actor emails in audit responses, conflicting with the previous actor-attribution implementation. Not altered or suppressed here. Total: 4 passed, 1 failed.
- `git diff --check` passed. Common component usage documentation updated.

Windows native build/runtime and iOS native runtime remain unavailable. This turn built macOS but did not exercise its native staff drawer. Mobile exports do not constitute native device qualification. Membership mutation enforcement is covered by the existing integration tests; this UI task did not change permissions or grant staff records implicit account access.
