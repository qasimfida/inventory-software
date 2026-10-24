# Product feature spec

Priority: **M** = must have, **S** = should have, **L** = later.
Agent task: for each item, mark Present / Partial / Missing with file paths, per platform.

## A. Core app checklist

### Onboarding and setup
- M: invitation acceptance, then a first-run checklist on the dashboard (business profile, currency, tax, locations, first product, first stock).
- M: business profile page (name, logo, address, currency, tax settings, receipt footer).
- S: CSV import for products, customers, suppliers and opening stock, with a preview and error report before commit.

### Dashboard
- M: role-based KPI cards (sales today, low stock, pending approvals, open POs, cash shift status), recent activity, quick actions.
- S: date-range filter, trend charts, and an attention list (overdue credit, stock count variances).

### Catalog
- M: products, categories, units, SKU and barcode, images, cost and sell price, price lists, active/archived status.
- M: product detail page with tabs: Overview, Stock (per location), Pricing, History (ledger), Channels (POS, online store).
- S: variants (size/color), brands, bulk edit, label/barcode printing, duplicate product.
- L: bundles/kits, lot/batch/expiry tracking, serial numbers.

### Inventory
- M: stock levels per location, movement ledger, adjustments with reason codes, stock counts, transfers, low-stock and reorder points.
- M: reservations (stock held for open orders) shown separately from on-hand.
- S: reorder suggestions that create draft purchase orders.

### Purchasing
- M: suppliers, PO lifecycle (draft, approved, sent, partially received, received, cancelled), receiving against a PO, supplier invoices, returns.
- S: PO PDF/email, supplier price history.

### Sales and POS
- M: POS screen (fast search/scan, cart, discounts, payment split, hold/resume cart, returns, receipts), cash shifts, customers with credit.
- M: sales order list and detail, sale corrections, refunds with approval where policy requires.
- S: quotes, delivery notes, receipt printing and PDF per platform.

### Reports and finance
- M: sales, stock valuation status, low stock, movements, purchases, payables, cash shift reports, all with export (CSV/PDF).
- S: scheduled report emails, saved filters.

### Administration
- M: users, invitations, roles and permission matrix, audit log, device list, notification settings, offline settings (permission-gated).
- S: data export/backup, session management, API keys for integrations.

### Cross-cutting UX (check every screen)
- M: global search and command palette, light/dark theme, sync/offline indicator, notifications center.
- M: tables with sticky header, column chooser, filters, saved views, pagination, bulk actions, empty/loading/error states.
- M: forms with inline validation, unsaved-changes warning, confirmation for destructive actions, undo toasts where possible.
- S: keyboard shortcuts (POS especially), accessibility pass, print stylesheets.
- L: multi-language and RTL.

## B. Online store (storefront)

### Scope and platforms
- Management screens (settings, product listing, orders): web, desktop, mobile, same as the rest of the app.
- The public storefront itself: web only. State that explicitly so the platform rule in AGENTS.md is satisfied.
- Storefront needs SEO and fast first load. Use SSR/SSG (Next.js or Vite SSR) as a separate app, e.g. `apps/storefront`. It consumes the public API only, never the internal one.

### Enabling the store
- Settings > Online Store has an enable switch. It is blocked until a prerequisites checklist is complete: business profile, currency, store name and URL slug, contact details, at least one fulfillment method (pickup or delivery), return/shipping policy text.
- Once enabled, an "Online Store" group appears in the sidebar: Overview, Products, Orders, Settings (Appearance, Fulfillment, Payments, Policies, Domain/slug).
- Disabling hides the store immediately, keeps all listing data, and warns about open orders.
- Permission: separate `onlineStore.manage` and `onlineStore.orders` permissions.

### Listing products (Online Store > Products)
Three tabs plus an "Add products" action:

1. **Active**: products live on the store. Columns: image, title, price, available qty, status (live / paused / out of stock), last updated. Actions: pause, remove, open on store, edit online details.
2. **Changes required**: selected products that fail readiness checks. Each row lists the missing/invalid fields as chips (e.g. "No image", "No description", "Price is 0") with a "Fix" link that opens the product at the right field. When fixed, the product moves automatically to tab 3.
3. **Ready to publish**: selected products that pass all checks, awaiting publish. Bulk "Publish selected" and a per-item publish. This is your "selected for publishing" tab.

"Add products" opens a picker (search, category filter, multi-select, already-listed items disabled). On confirm, every selected product is validated and sorted into tab 2 or 3. Show a result summary: "12 ready, 5 need changes".

### Readiness rules (single shared function, used by UI and server)
Blocking:
- Title (min length), description (min length), at least one image, selling price > 0, category, SKU, unit.
- Sellable quantity > 0, or a "continue selling when out of stock" flag.
- Weight (and dimensions if your fulfillment needs them) when delivery is enabled.
- Every variant meets the same rules.

Warnings (don't block, shown as tips): only one image, no SEO title, no brand.

The server runs the same checks on publish; never trust the client. Rules are versioned so a later rule change re-validates all listings.

### Status model
`selected` -> (validate) -> `needs_changes` or `ready` -> (publish) -> `active` -> `paused` / `delisted`.
- Active products are re-validated whenever the product, price, images or stock changes. If they fail (e.g. price removed), they auto-delist to "Changes required" and the owner gets a notification.
- Out of stock products show "Sold out" on the store, or hide, per a setting.

### Online-specific overrides
Optional per-listing overrides: online title, description, images order, online price (default: follow POS price list), visibility. Never expose cost price, supplier, internal notes, or exact stock counts (show In stock / Low stock / Sold out).

### Inventory and order rules (the risky part)
- Available to sell = on hand − reserved − safety buffer. Add a per-business buffer or a per-listing channel cap to reduce overselling.
- Checkout reserves stock transactionally. Unpaid or unconfirmed reservations expire.
- Stock deduction happens through LedgerCore at fulfillment, not by editing quantities directly.
- POS sales synced late from offline registers can cause overselling. Document this and handle it as a conflict that needs staff review, never silent last-write-wins.
- Order lifecycle: placed, confirmed, packed, shipped / ready for pickup, completed, cancelled, refunded. Each transition is logged and notifies the customer.
- Online orders appear in the normal sales order list with channel = online, so reports and finance posting stay unified.

### Payments (v1)
- Cash on delivery, pay at pickup, manual bank transfer with a "mark as paid" action.
- Later: card provider through the existing (disabled) provider foundation. Out of scope until a provider is chosen.

### Public storefront pages
Home, category/catalog with filters and sort, search, product detail (gallery, price, availability, variants), cart, guest checkout (contact, address or pickup, payment method), order confirmation with an order status link, policies, contact. Mobile-first layout. Branding limited to logo, accent color and banner.

### Security and privacy
- Separate public, read-only API (or cached projection) that returns only published fields. Resolve the business by slug. Strict tenant isolation.
- Rate limiting and bot protection on checkout. Validate prices and availability on the server at checkout, never from the cart payload.
- Customer PII minimized and covered by the existing authorization and audit rules.

### Data model sketch
- `StorefrontSettings`: businessId, enabled, slug, name, branding, contact, policies, fulfillment, payment methods.
- `ChannelListing`: businessId, productId/variantId, status, issues[], overrides, publishedAt, ruleVersion.
- `Order`: add `channel` (pos | online) and a fulfillment record; reuse the sales and ledger modules.

### Online store analytics

Visible only when the store is enabled and the user has `onlineStore.analytics.view`.

**Where it appears**
1. **Main dashboard (Overview):** a compact "Online store" section with 4 KPI cards (revenue, orders, visitors, conversion rate), each with change vs the previous period, a small trend line, and a "View analytics" link. Hidden entirely when the store is disabled.
2. **Online Store > Overview:** the same KPIs plus an attention list (orders awaiting confirmation, products in Changes required, sold-out active listings, abandoned carts today).
3. **Online Store > Analytics (separate page):** full analytics with tabs.

**Analytics page tabs**
- **Sales:** revenue, orders, average order value, refunds/cancellations, revenue by day, payment method split, online vs POS revenue share.
- **Traffic:** visitors, sessions, page views, traffic sources, top landing pages, device split, top search terms, searches with no results.
- **Funnel:** visits, product views, add to cart, checkout started, order placed, with drop-off % per step and abandoned carts.
- **Products:** top sellers, most viewed, high views with low conversion, sold-out items still getting views.
- **Customers:** new vs returning, top locations/regions, repeat purchase rate.
- **Listing health:** counts per status (Active, Changes required, Ready to publish), products auto-delisted this period and why, listings with warnings.

**UX rules**
- Date range presets (today, 7d, 30d, 90d, custom) with a "compare to previous period" toggle. The selection persists across tabs.
- KPI cards show value, delta with direction and color plus an icon (never color alone), and a sparkline.
- Every chart has a table view for accessibility and a CSV export. Tables are sortable, with links through to the product or order.
- Loading skeletons, an empty state ("No visits yet, share your store link" with a copy button), an error state with retry, and an "as of" timestamp.
- Mobile: KPI cards first, charts stacked, tabs become a segmented control or scrollable chips.
- Analytics is online-only. When offline, show the last loaded data with its "as of" time, labelled as cached.

**Data and accuracy**
- Revenue, order counts, refunds and customer counts come from orders and ledger/journal data, not from tracking events. They must match the main Reports numbers exactly, including currency and the business timezone.
- Traffic and funnel metrics come from first-party storefront events (page view, product view, search, add to cart, checkout start). Label them "approximate".
- Event ingestion: a public, rate-limited endpoint with no PII, an anonymous session ID, bot filtering, and respect for Do Not Track and any consent requirement in the business's region.
- Aggregate events into daily rollups per business so dashboards read rollups, not raw events. Set a retention period for raw events.
- Strict tenant isolation: analytics queries always scope by business and permission.
- Add the store's key reports to the Reports module (sales by channel, top products online) so they export alongside the rest.

**Mock data:** seed 90 days of events and orders, including a seasonal spike, an empty-store scenario, and an error scenario.

## C. Suggested build order
1. Gap analysis against sections A and B (agent).
2. Finish the shell, auth, design system and mock data work.
3. Close M-priority gaps in section A.
4. Hardening: tests, offline sync QA, security review, real-device runs.
5. Storefront backend: settings, ChannelListing, readiness engine, public projection API.
6. Management UI: enable flow, Products tabs, orders.
7. Storefront app and checkout.
8. Order and stock integration (reservations, fulfillment, reports).
9. Pilot with one business, fix issues, then consider payment providers.