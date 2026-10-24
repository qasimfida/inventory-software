-- Up Migration
ALTER TABLE organization_audit ADD CONSTRAINT organization_audit_business_identity UNIQUE(business_id,id);
CREATE TABLE business_deliveries (
 id uuid PRIMARY KEY,position bigint GENERATED ALWAYS AS IDENTITY UNIQUE,
 business_id uuid NOT NULL REFERENCES businesses(id),event_id bigint NOT NULL,
 recipient_id uuid NOT NULL REFERENCES auth_accounts(id),permission text NOT NULL CHECK(permission IN ('business.write','purchases.read','purchases.write','stock.read','stock.write','sales.refund','sales.void')),
 store_id uuid,warehouse_id uuid,
 state text NOT NULL DEFAULT 'pending' CHECK(state IN ('pending','delivered','failed')),
 attempts integer NOT NULL DEFAULT 0 CHECK(attempts BETWEEN 0 AND 8),
 next_attempt_at timestamptz NOT NULL DEFAULT now(),delivered_at timestamptz,read_at timestamptz,failure_code text,
 UNIQUE(event_id,recipient_id),
 FOREIGN KEY(business_id,event_id) REFERENCES organization_audit(business_id,id),
 CHECK(warehouse_id IS NULL OR store_id IS NOT NULL),
 FOREIGN KEY(business_id,store_id,warehouse_id) REFERENCES warehouses(business_id,store_id,id),
 FOREIGN KEY(business_id,store_id) REFERENCES stores(business_id,id),
 FOREIGN KEY(business_id,warehouse_id) REFERENCES warehouses(business_id,id)
);
CREATE INDEX business_delivery_due ON business_deliveries(next_attempt_at) WHERE state='pending';
CREATE INDEX business_delivery_recipient ON business_deliveries(business_id,recipient_id,position DESC);
CREATE INDEX report_sales_period ON sales(business_id,created_at,warehouse_id);
CREATE INDEX report_movement_period ON stock_movements(business_id,created_at,warehouse_id);
CREATE INDEX report_return_period ON sale_returns(business_id,created_at,sale_id);
CREATE INDEX report_invoice_period ON supplier_invoices(business_id,created_at,purchase_id);
CREATE INDEX report_cash_period ON cash_payments(business_id,created_at,warehouse_id);
-- Down Migration
DROP INDEX report_cash_period,report_invoice_period,report_return_period,report_movement_period,report_sales_period;
DROP TABLE business_deliveries;
ALTER TABLE organization_audit DROP CONSTRAINT organization_audit_business_identity;
