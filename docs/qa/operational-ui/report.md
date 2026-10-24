# Operational UI and role verification — 22 October 2026

## Delivered

- Demo mode now offers superadmin, owner, manager, cashier, inventory, accountant and viewer accounts. Existing fixtures cover catalog/pricing, stock/ledger, counts, storage, purchasing/receiving/returns, transfers, customers/credit, POS quotes, receipts, shifts, payables, reports, approvals, audit, settings, trading and accounting. Added platform registration history, directory/location counts and restricted diagnostic fixtures. Normal, empty, error and offline scenarios remain explicit. See [demo instructions](../../development/mock-data.md).
- Restored the actual 30-day superadmin registration chart with accessible daily figures. View all businesses remains below it. Overview metrics use the inventory semantic palette.
- Changed the sidebar toggle to directional double chevrons. Workspace/profile bands follow header height; header dividers are shorter. Page titles appear in the header; common headers suppress exact duplicates. Native common headers follow the same convention.
- POS warehouse selection is a compact contextual control (web popover/native drawer). Cash shifts/history remain accessible; warehouse selection still locks when a cart is in progress. Essential checkout context was not removed.
- POS policy detail is collapsible on web. The cart measures available viewport space, including its initial position, scrolls internally and preserves a separate sticky Checkout footer. Native retains its cart dock and fixed drawer footer. Item buttons display price and a cart icon. Product grids contain artwork, long titles and controls.
- Three shared icon sizes (16/20/24) are available in existing account preferences, preserving policy precedence and stored values. Web Lucide and native common icon controls consume them; the showcase demonstrates variants. Existing charts and non-icon artwork retain their own dimensions.
- Settings tabs stay visible below the measured web header, including wrapped mobile headers; native tabs sit outside the content scroll area. View toggles use the same bordered secondary surface. Refresh controls align consistently. Popup search icons are inside inputs; fine-pointer popup controls are compact while touch targets remain accessible.
- Registered-business list/grid shows store and warehouse counts. Grid uses business cards and a details drawer for locations; table retains lazy nested rows. Counts come from the platform-authorized query and existing business-key indexes. No migration required.
- Added `/logs` on web/desktop/native using existing audit access. Business logs remain tenant-scoped; only platform administrators can request restricted platform security/diagnostics. This is a safe audit UI, not access to raw process logs.

## Cart conflict correction

The shared client previously translated every 409 into the duplicate-code/last-owner organization message. The pricing service now emits an allowlisted `PRICE_UNAVAILABLE` error for missing active prices; incompatible currency and missing checkout-store context have specific safe errors too. Other exception text is still redacted. The supplied historical reference was not available in retained logs; the missing-price failure was reproduced against a real database and corrected through the pricing API. An item without an authorized active price still cannot be sold; the UI does not invent prices or bypass validation.

An isolated local checkout fixture was created through product, price and idempotent opening-movement APIs. The test sale, opening ledger record and databases were retained. See [fixture](seed.json), [checkout](checkout.json) and the [retained database registry](../retained-test-databases.json). No existing production data or stored account preferences were reset.

## Verification evidence

- Root type checks passed. Later targeted web/native type checks passed after layout hooks.
- Unit suite: **222 tests / 106 files passed**. Tooling suite: **14 passed**. Final native-entry/POS focused run: **2 passed**.
- Real database: platform directory **4 tests passed**, pricing recovery **1 passed**. Tests applied migrations in isolated retained databases, checked unauthenticated/forbidden/cross-business access, counts and bounded pagination, missing-price rejection and a successful quote after authorized pricing.
- Browser regression suite: **24 passed**, covering themes, preferences, focus, dialogs, responsive layout and accessibility.
- Live seven-role walkthrough: **147 allowed-screen visits**, denied-route checks, **0 issues**, no page errors or unexpected failed API calls. Includes web widths 1440, 768 and 390. [Role results](roles.json).
- Actual cash checkout: **USD 13.75 total, USD 1.25 change**, server-confirmed receipt; cashier/superadmin carts survive overview and inventory navigation. [Checkout results](checkout.json).
- Browser component walkthrough: restored chart, counts, grid location drawer, restricted diagnostics, three icon sizes, no overflow and sticky settings tabs at **1440/768/390**. [Results](browser-results.json). Found and fixed an overlap caused by a two-row phone header.
- Long-cart browser walkthrough: **25 items**, internal scrolling and stable Checkout footer at **1440/390**, **0 axe violations**, **0 page errors**; no demo sale submission. [Results](cart-results.json).
- Android 16 ARM64 / Expo Go emulator, 1080×2400: all seven live accounts passed login, role landing, section navigation and logout. [Role results](android-roles.json). Native demo POS add/cart drawer/Checkout review/footer passed. [Cart results](android-cart-results.json).
- API/web production build, Android/iOS/web JS exports and macOS `.app` build passed. The rebuilt macOS app was launched and its sign-in window inspected at 1100×760 ([capture](macos-launch.png)); authenticated native desktop workflows were not verified. No new dependencies or database migration added.
- Final lint: **0 errors, 23 existing source-length warnings**; dependency boundaries passed (**889 modules / 4,706 dependencies**). Foundation check: **82 documents / 928 source files**. `git diff --check` passed. Whole-repository formatting reports only the pre-existing user-maintained `AGENTS.md`; it was left untouched. All task source and QA artifacts are formatted.

## Limits

Demo fixtures simulate reads, quotes and limited local UI state; inventory/financial writes deliberately require the live test API. They are not a replacement transactional backend or a reconciled accounting dataset. Role navigation is not exhaustive verification of every possible mutation for each role. Browser/Android checks do not qualify receipt printers, scanners, offline restart recovery or accessibility assistive technology. macOS native authenticated workflows, Windows execution and iOS device execution remain unverified; Windows and an iOS native toolchain are unavailable here. Desktop shares the verified web UI but still requires native release/device qualification. No production-readiness claim.
