Build quotations on all platforms. Design first, then stop for approval.

Inspect: pricing and quote resolver (POS quote), customers, products and units, tax, receipts and printing, company profile and branding, permissions, sales and POS cart, existing PDF or print approach.

DESIGN STEP decisions to propose with a recommendation:
- PDF and print output: one approach that is consistent on web, desktop and mobile; compare options and any dependency needed (needs my approval).
- Price policy: price snapshot at quote time; "Refresh prices" shows differences; honoring quoted prices at conversion only while valid and with permission; whether to reserve stock (recommend: no in v1).
- Numbering: per business and store, with prefix and sequence.

Data model: Quotation (business, store, number, status draft|sent|accepted|rejected|expired|converted, customer or walk-in details, issue and valid-until dates, currency, templateId, notes and terms, subtotal, discount, tax, total (server-calculated), revision, createdBy, convertedSaleId), QuotationLine (product, variant, unit, description, quantity, unit price from the resolver, override flag and reason, discount, tax, line total, sort order, informational availability), events/history. Status transitions enforced on the server; expired by date.

Templates: three code-defined presentation templates: Classic (formal), Modern (minimal), Detailed (product images, descriptions, terms, signature). Options per template (images, SKU, tax column, signature, bank details, footer). Branding from the company profile. Default template per business, chosen per quotation. No user HTML in v1.

Editor, web and desktop: a spreadsheet-like line grid following the ARIA grid pattern. Columns: No, Product, Description, Unit, Qty, Unit price, Discount, Tax, Total. Selecting a product populates its actual price. Clicking a cell edits it in place at the same location (no modal): Enter or typing starts editing, Enter commits and moves down, Tab and Shift+Tab move across, arrows navigate, Esc cancels; validation on commit; computed cells read-only; blank last row to add products (typing opens a product search, barcode add); reorder, duplicate and delete rows; live totals confirmed by the server quote; autosaved draft with a "Saved" indicator; unsaved-changes guard. Build it on the existing table and a small cell editor; don't add a heavy grid library without approval.
Mobile: line cards with tap-to-edit quantity and price (numeric keypad) and expandable details; tablets in landscape may use the grid layout.

Pages: list (filters by status, customer, date; search; expiry warnings), detail/editor, template picker as the first step, preview, print and PDF/share, actions Save draft, Mark sent, Accepted, Rejected, Duplicate, Revise (new revision), Convert to sale (opens POS prefilled at quoted prices per the price policy). Permissions: view, create/manage, price override, convert.

Acceptance: end-to-end quote create, edit in grid, preview in each template, export, status changes and conversion work on web, desktop and mobile; totals match the server quote; permissions and audit enforced.