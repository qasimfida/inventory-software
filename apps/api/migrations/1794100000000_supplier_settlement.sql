-- Up Migration
ALTER TABLE supplier_invoices ADD CONSTRAINT supplier_invoice_business UNIQUE(business_id,id);
ALTER TABLE purchase_returns ADD CONSTRAINT purchase_return_business UNIQUE(business_id,id);
ALTER TABLE purchase_returns ADD COLUMN damaged numeric(24,6) NOT NULL DEFAULT 0 CHECK(damaged>=0 AND damaged<=quantity);
CREATE TABLE supplier_credits(
 id uuid PRIMARY KEY,business_id uuid NOT NULL,invoice_id uuid NOT NULL,return_id uuid NOT NULL,
 amount_minor numeric(24,0) NOT NULL CHECK(amount_minor>0),reference text NOT NULL,reason text NOT NULL,
 actor_id uuid NOT NULL REFERENCES auth_accounts(id),created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(business_id,return_id),UNIQUE(business_id,invoice_id,reference),
 FOREIGN KEY(business_id,invoice_id) REFERENCES supplier_invoices(business_id,id),
 FOREIGN KEY(business_id,return_id) REFERENCES purchase_returns(business_id,id)
);
CREATE TABLE supplier_settlements(
 id uuid PRIMARY KEY,business_id uuid NOT NULL,invoice_id uuid NOT NULL,shift_id uuid NOT NULL,
 kind text NOT NULL CHECK(kind IN ('payment','refund')),amount_minor numeric(24,0) NOT NULL CHECK(amount_minor>0),
 reference text NOT NULL,actor_id uuid NOT NULL REFERENCES auth_accounts(id),created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(business_id,invoice_id,kind,reference),
 FOREIGN KEY(business_id,invoice_id) REFERENCES supplier_invoices(business_id,id),
 FOREIGN KEY(business_id,shift_id) REFERENCES cash_shifts(business_id,id)
);
CREATE INDEX supplier_credit_invoice ON supplier_credits(business_id,invoice_id,created_at,id);
CREATE INDEX supplier_settlement_invoice ON supplier_settlements(business_id,invoice_id,created_at,id);
CREATE TRIGGER supplier_credit_immutable BEFORE UPDATE OR DELETE ON supplier_credits FOR EACH ROW EXECUTE FUNCTION organization_audit_immutable();
CREATE TRIGGER supplier_settlement_immutable BEFORE UPDATE OR DELETE ON supplier_settlements FOR EACH ROW EXECUTE FUNCTION organization_audit_immutable();
-- Down Migration
DROP TABLE supplier_settlements,supplier_credits;
ALTER TABLE purchase_returns DROP COLUMN damaged,DROP CONSTRAINT purchase_return_business;
ALTER TABLE supplier_invoices DROP CONSTRAINT supplier_invoice_business;
