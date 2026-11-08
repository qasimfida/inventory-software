Redesign POS without changing its transaction architecture. Inspect apps/web/src/features/pos/PosPanel.tsx, PosCheckout.tsx, packages/api-client/src/pos-model.ts, related product, customer, payment and offline modules, and the native POS and scanner.

STEP 0, before any UI change: write characterization tests pinning current behavior: commands and API calls issued, line identity and merging, quote refresh and staleness, discounts, cash and authorized credit, duplicate-submission protection, stable command IDs, uncertain-outcome recovery, held carts. They must pass before and after.

1. Desktop: search and barcode input, categories, grid or list, image/price/stock/variant/unit, cart, quantity controls, discounts, customer, subtotals, tax, payment, checkout. Stable two-pane layout with minimal scrolling.
2. Tablet: columns, cart access, touch controls, search placement, payment flow, drawer behavior.
3. Mobile: focused flow (browse, search/scan, cart dock, cart review, payment, receipt). Don't squeeze the desktop two-column layout.
4. Browsing: search cancellation, bounded results, scanner focus, suggestions, large result sets. Don't claim scan-Enter auto-adds unless verified.
5. Cart: add, remove, quantity, unit change, merging, price, discounts, availability, customer context, validation, stale quote, empty.
6. Checkout: server quote, loading and staleness, cash, authorized credit, validation, pending, success, failure, uncertain outcome, receipt, recovery. No unsupported payment methods shown as working. No duplicate submissions.
7. Offline and scanning: keep restrictions; clearly distinguish locally pending, submitted, server-confirmed, failed, uncertain.
8. Receipts and print: redesign receipt display and print styles on web, desktop and mobile; keep reprint behavior.
9. Verify: repeated adds, quantity and unit changes, discounts, quote refresh and stale quote, cash and credit checkout, duplicates, network interruption, uncertain response, recovery, receipt, scanner input, touch, keyboard navigation, mobile layout, held carts.

Acceptance: redesigned and responsive; characterization tests unchanged and passing; no stock, pricing, tax, payment or transaction semantic changed.