-- Up Migration
CREATE TABLE suppliers(id uuid PRIMARY KEY,business_id uuid NOT NULL REFERENCES businesses(id),name text NOT NULL,code text NOT NULL,email text NOT NULL DEFAULT '',phone text NOT NULL DEFAULT '',notes text NOT NULL DEFAULT '',state text NOT NULL CHECK(state IN ('active','inactive','archived')),version integer NOT NULL DEFAULT 1,UNIQUE(business_id,id),UNIQUE(business_id,code));
CREATE TABLE purchase_orders(id uuid PRIMARY KEY,business_id uuid NOT NULL,supplier_id uuid NOT NULL,warehouse_id uuid NOT NULL,currency text NOT NULL,state text NOT NULL CHECK(state IN ('draft','approved','ordered','partially_received','completed','cancelled')),version integer NOT NULL DEFAULT 1,reference text NOT NULL,actor_id uuid NOT NULL REFERENCES auth_accounts(id),created_at timestamptz NOT NULL DEFAULT now(),UNIQUE(business_id,id),UNIQUE(business_id,reference),FOREIGN KEY(business_id,supplier_id) REFERENCES suppliers(business_id,id),FOREIGN KEY(business_id,warehouse_id) REFERENCES warehouses(business_id,id));
CREATE INDEX purchase_scope ON purchase_orders(business_id,warehouse_id,supplier_id,created_at,id);
CREATE TABLE purchase_lines(id uuid PRIMARY KEY,business_id uuid NOT NULL,purchase_id uuid NOT NULL,variant_id uuid NOT NULL,unit_id uuid NOT NULL,quantity numeric(24,6) NOT NULL CHECK(quantity>0),base_quantity numeric(24,6) NOT NULL CHECK(base_quantity>0),unit_cost numeric(24,6) NOT NULL CHECK(unit_cost>=0),received numeric(24,6) NOT NULL DEFAULT 0 CHECK(received>=0 AND received<=quantity),UNIQUE(business_id,id),FOREIGN KEY(business_id,purchase_id) REFERENCES purchase_orders(business_id,id),FOREIGN KEY(business_id,variant_id) REFERENCES catalog_variants(business_id,id),FOREIGN KEY(business_id,unit_id) REFERENCES catalog_units(business_id,id));
CREATE INDEX purchase_line_order ON purchase_lines(business_id,purchase_id,id);
CREATE TABLE purchase_receipts(id uuid PRIMARY KEY,business_id uuid NOT NULL,line_id uuid NOT NULL,location_id uuid NOT NULL,quantity numeric(24,6) NOT NULL CHECK(quantity>0),base_quantity numeric(24,6) NOT NULL CHECK(base_quantity>0),movement_id uuid NOT NULL,actor_id uuid NOT NULL REFERENCES auth_accounts(id),created_at timestamptz NOT NULL DEFAULT now(),UNIQUE(business_id,id),FOREIGN KEY(business_id,line_id) REFERENCES purchase_lines(business_id,id),FOREIGN KEY(business_id,movement_id) REFERENCES stock_movements(business_id,id));
CREATE INDEX purchase_receipt_line ON purchase_receipts(business_id,line_id,id);
CREATE TABLE purchase_returns(id uuid PRIMARY KEY,business_id uuid NOT NULL,receipt_id uuid NOT NULL,quantity numeric(24,6) NOT NULL CHECK(quantity>0),base_quantity numeric(24,6) NOT NULL CHECK(base_quantity>0),movement_id uuid NOT NULL,reason text NOT NULL,credit_reference text NOT NULL,actor_id uuid NOT NULL REFERENCES auth_accounts(id),created_at timestamptz NOT NULL DEFAULT now(),FOREIGN KEY(business_id,receipt_id) REFERENCES purchase_receipts(business_id,id),FOREIGN KEY(business_id,movement_id) REFERENCES stock_movements(business_id,id));
CREATE INDEX purchase_return_receipt ON purchase_returns(business_id,receipt_id);
CREATE TABLE supplier_invoices(id uuid PRIMARY KEY,business_id uuid NOT NULL,purchase_id uuid NOT NULL,reference text NOT NULL,amount_minor numeric(24,0) NOT NULL CHECK(amount_minor>0),due_date date NOT NULL,actor_id uuid NOT NULL REFERENCES auth_accounts(id),created_at timestamptz NOT NULL DEFAULT now(),UNIQUE(business_id,purchase_id,reference),FOREIGN KEY(business_id,purchase_id) REFERENCES purchase_orders(business_id,id));
CREATE TRIGGER receipt_immutable BEFORE UPDATE OR DELETE ON purchase_receipts FOR EACH ROW EXECUTE FUNCTION organization_audit_immutable();
CREATE TRIGGER return_immutable BEFORE UPDATE OR DELETE ON purchase_returns FOR EACH ROW EXECUTE FUNCTION organization_audit_immutable();
CREATE TRIGGER invoice_immutable BEFORE UPDATE OR DELETE ON supplier_invoices FOR EACH ROW EXECUTE FUNCTION organization_audit_immutable();
CREATE FUNCTION purchase_lines_history_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF (SELECT state FROM purchase_orders WHERE business_id=OLD.business_id AND id=OLD.purchase_id)<>'draft' THEN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Posted lines cannot be deleted' USING ERRCODE='23514'; END IF;
 IF ROW(NEW.business_id,NEW.purchase_id,NEW.variant_id,NEW.unit_id,NEW.quantity,NEW.base_quantity,NEW.unit_cost) IS DISTINCT FROM ROW(OLD.business_id,OLD.purchase_id,OLD.variant_id,OLD.unit_id,OLD.quantity,OLD.base_quantity,OLD.unit_cost) THEN RAISE EXCEPTION 'Posted line identity and quantities are immutable' USING ERRCODE='23514'; END IF;
 END IF;
 IF TG_OP='DELETE' THEN RETURN OLD; END IF; RETURN NEW;
END;$$;
CREATE TRIGGER purchase_lines_history_guard BEFORE UPDATE OR DELETE ON purchase_lines FOR EACH ROW EXECUTE FUNCTION purchase_lines_history_guard();
-- Down Migration
DROP TABLE supplier_invoices,purchase_returns,purchase_receipts,purchase_lines,purchase_orders,suppliers;

DROP FUNCTION purchase_lines_history_guard();
