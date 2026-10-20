-- Up Migration
CREATE TABLE sales(id uuid PRIMARY KEY,business_id uuid NOT NULL,store_id uuid NOT NULL,warehouse_id uuid NOT NULL,customer_id uuid,currency text NOT NULL,net_minor numeric(24,0) NOT NULL CHECK(net_minor>=0),tax_minor numeric(24,0) NOT NULL CHECK(tax_minor>=0),total_minor numeric(24,0) NOT NULL CHECK(total_minor=net_minor+tax_minor),cash_received_minor numeric(24,0) NOT NULL CHECK(cash_received_minor>=0),change_minor numeric(24,0) NOT NULL CHECK(change_minor>=0),state text NOT NULL DEFAULT 'completed' CHECK(state IN ('completed','partially_returned','returned','voided')),actor_id uuid NOT NULL REFERENCES auth_accounts(id),created_at timestamptz NOT NULL DEFAULT now(),UNIQUE(business_id,id),FOREIGN KEY(business_id,store_id,warehouse_id) REFERENCES warehouses(business_id,store_id,id),FOREIGN KEY(business_id,store_id,customer_id) REFERENCES customers(business_id,store_id,id));
CREATE INDEX sale_scope ON sales(business_id,warehouse_id,created_at DESC,id);
CREATE TABLE sale_lines(id uuid PRIMARY KEY,business_id uuid NOT NULL,sale_id uuid NOT NULL,variant_id uuid NOT NULL,unit_id uuid NOT NULL,location_id uuid NOT NULL,name text NOT NULL,sku text NOT NULL,quantity numeric(24,6) NOT NULL CHECK(quantity>0),base_quantity numeric(24,6) NOT NULL CHECK(base_quantity>0),unit_price numeric(24,6) NOT NULL CHECK(unit_price>=0),price_id uuid NOT NULL,promotion_id uuid,discount_basis_points integer NOT NULL,manual_discount_basis_points integer NOT NULL,tax_basis_points integer NOT NULL,tax_inclusive boolean NOT NULL,net_minor numeric(24,0) NOT NULL,tax_minor numeric(24,0) NOT NULL,total_minor numeric(24,0) NOT NULL CHECK(total_minor=net_minor+tax_minor),track_inventory boolean NOT NULL,movement_id uuid,UNIQUE(business_id,id),FOREIGN KEY(business_id,sale_id) REFERENCES sales(business_id,id),FOREIGN KEY(business_id,variant_id) REFERENCES catalog_variants(business_id,id),FOREIGN KEY(business_id,unit_id) REFERENCES catalog_units(business_id,id),FOREIGN KEY(business_id,price_id) REFERENCES price_entries(business_id,id),FOREIGN KEY(business_id,movement_id) REFERENCES stock_movements(business_id,id));
CREATE INDEX sale_line_parent ON sale_lines(business_id,sale_id,id);
CREATE TRIGGER sale_line_immutable BEFORE UPDATE OR DELETE ON sale_lines FOR EACH ROW EXECUTE FUNCTION organization_audit_immutable();
CREATE FUNCTION sale_history_guard() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Completed sales cannot be deleted' USING ERRCODE='23514'; END IF;
 IF (to_jsonb(NEW)-'state') IS DISTINCT FROM (to_jsonb(OLD)-'state') THEN RAISE EXCEPTION 'Financial sale fields are immutable' USING ERRCODE='23514'; END IF; RETURN NEW; END; $$;
CREATE TRIGGER sale_history BEFORE UPDATE OR DELETE ON sales FOR EACH ROW EXECUTE FUNCTION sale_history_guard();
ALTER TABLE customer_receivables ADD CONSTRAINT receivable_sale FOREIGN KEY(business_id,sale_id) REFERENCES sales(business_id,id);
ALTER TABLE cash_payments ADD CONSTRAINT cash_payment_sale FOREIGN KEY(business_id,sale_id) REFERENCES sales(business_id,id);
ALTER TABLE stock_movements DROP CONSTRAINT stock_movements_source_kind_check;
ALTER TABLE stock_movements ADD CONSTRAINT stock_movements_source_kind_check CHECK(source_kind IN ('manual','reservation','reservation_release','reversal','purchase_receipt','purchase_return','transfer_dispatch','transfer_receive','location_move','sale','sale_return'));
-- Down Migration
ALTER TABLE cash_payments DROP CONSTRAINT cash_payment_sale;
ALTER TABLE customer_receivables DROP CONSTRAINT receivable_sale;
DROP TABLE sale_lines,sales;
DROP FUNCTION sale_history_guard();
-- Existing sale movements retain traceability strings during a development rollback; never erase inventory history.
