Complete POS checkout on all platforms and fix the grid product card. Skip the design-approval stop unless you find a blocker; characterization tests come first.

STEP 0: write characterization tests pinning current behavior (commands and API calls, line merging, quote refresh and staleness, cash and credit semantics, duplicate-submission protection, stable command IDs, uncertain-outcome recovery, held carts). They must still pass at the end.

Inspect PosPanel, PosCheckout, pos-model, checkout.service, receipts, shifts, customer credit and the native POS.

1. Checkout flow (web, desktop, mobile)
- Review step: cart summary, customer, discounts, tax, total (from the server quote).
- Payment step: cash and customer credit only. Card or other methods are not shown as working (hidden or disabled with "Not available"). Cash: amount received, quick-amount buttons, change due (display only; server stays authoritative), validation. Credit: requires a customer, shows limit, current balance and balance after, blocks when over the limit unless the user has the existing permission to override. Split: cash plus the remainder on credit, using the existing semantics.
- Open cash shift required: if none is open, offer to open one (permission-aware) instead of failing.
- Submit: pending state, buttons disabled, stable command ID, no double submission.
- Failure states: stale quote (refresh and review), insufficient stock, shift closed, credit limit, permission, network. Uncertain outcome: "We couldn't confirm this sale" with a "Check status" action that looks up by command ID and shows the receipt or the retry option.
- Offline: keep existing restrictions; clearly show "Saved locally, not yet confirmed" versus "Confirmed".

2. Completion screen replacing the current text message: success header with sale number and total, change due (large), payment summary, receipt preview, actions Print receipt, Save/Share PDF where the platform supports it, View sale, and New sale (primary). The cart clears, focus returns to search or scanner for the next sale. Add the keyboard flow on desktop (Enter to confirm, Esc to go back).

3. Product card (grid view only; list view is fine)
- The whole card opens product details (drawer or sheet). Remove the title button. Add to cart and any other action buttons must not trigger the card.
- Accessibility: avoid nested interactive elements; use a single accessible card link or button with a stretched hit area and the actions raised above it. Visible focus on the card, Enter and Space open it, hover and pressed states, out-of-stock and disabled cards still open details.
- Native: pressable card opens details, Add to cart is a separate touch target (at least 44px).

Acceptance: complete cash, credit and split checkouts end with a receipt flow on every platform; no duplicate sale is possible; the card behaves as specified on web, desktop and mobile; characterization tests pass.