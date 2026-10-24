# Routed application shell audit — 2026-10-21

The application now has separate authentication and workspace layouts, a shared permission-aware route registry, web/Tauri sidebar navigation, and a native tab/More navigation stack. Existing domain panels and clients are reused. This is a shell/UX and development-fixture change, not a replacement inventory or finance implementation.

## Implemented

- Web/Tauri: sticky title/breadcrumb header, accessible bounded route/product/customer search, keyboard shortcut, theme control, recent-page unread count, truthful connection indicator, collapsible 100dvh sidebar with independent navigation scrolling and pinned upward profile menu.
- Native: five primary tabs where permissions allow, grouped More/search, Android hardware back, safe areas/keyboard handling, Profile/theme controls, unread/connection status, retained visited panels and cart state.
- Settings: separate profile, business, preferences, security, device/offline, notifications, users, locations and audit destinations. Business switching/creation lives here or onboarding, not chrome. Boolean effects use Switch; few-option preferences use segmented/radio controls. Policy-enforced values stay disabled and labeled.
- Auth: isolated login/invitation forms, password reveal, separate operator-assisted recovery, read-only token preflight, confirmation/length guidance, existing transactional reset/session revocation. Auth links are validated and removed from the web address before rendering. No email/admin notification is fabricated.
- Links: Expo custom scheme and configurable verified HTTPS associations; isolated Tauri deep-link adapter and single-instance focus. Installed signed-app link registration remains a deployment/device qualification task.
- Mock mode: opt-in development transport, shared role/tenant/scenario fixtures, runtime contract validation, no network fallback, separate credentials/vault/preferences, production guards and fixture exclusion. Unsupported business mutations fail explicitly.
- Native rendering warnings caused by empty strings outside Text and web use of Android BackHandler were corrected. Native routed panels open their content on entry; visited panels remain mounted to retain work.

## Scope review

No business tables, migrations, price/stock posting rules or permission definitions were added or changed by this task. The new backend endpoint only checks an existing hashed recovery token; final reset revalidates transactionally. Mock pricing reuses domain calculations. Generic mutation retry behavior is unchanged. The existing large dirty worktree was preserved and nothing was committed.

The new test-fixture option `TEST_RETAIN_DATABASES=true` skips teardown migrations/database drops only. It does not skip test assertions or up migrations. It allowed real authentication/recovery verification without destructive cleanup. Four isolated test databases remain; see the [retained database list](qa/retained-test-databases.json).

## Evidence and limitations

See the [QA report](qa/report.md) for exact checks, screenshots and platform limits, the [route inventory](routes.md), [mock-data guide](development/mock-data.md), [deep-link configuration](deep-linking.md), and [common components](development/common-components.md).

No production hostname was found in the existing configuration: only local origins and invalid placeholders. No host was invented. Production link associations, provider delivery, Windows/iOS execution, installed-app deep links, signing and native transaction/device qualification remain outstanding. Mock reads and quotes are not proof of financial posting or durable offline synchronization. No production-readiness claim is made.
