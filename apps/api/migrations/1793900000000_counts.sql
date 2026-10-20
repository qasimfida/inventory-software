-- Up Migration
CREATE TABLE stock_counts(id uuid PRIMARY KEY,business_id uuid NOT NULL,warehouse_id uuid NOT NULL,location_id uuid NOT NULL,blind boolean NOT NULL,state text NOT NULL DEFAULT 'draft' CHECK(state IN ('draft','review','approved')),version integer NOT NULL DEFAULT 1 CHECK(version>0),created_by uuid NOT NULL REFERENCES auth_accounts(id),approved_by uuid REFERENCES auth_accounts(id),created_at timestamptz NOT NULL DEFAULT now(),approved_at timestamptz,UNIQUE(business_id,id),FOREIGN KEY(business_id,warehouse_id,location_id) REFERENCES storage_locations(business_id,warehouse_id,id));
CREATE INDEX counts_scope ON stock_counts(business_id,warehouse_id,created_at DESC);
CREATE TABLE stock_count_lines(id uuid PRIMARY KEY,business_id uuid NOT NULL,count_id uuid NOT NULL,variant_id uuid NOT NULL,expected numeric(24,6) NOT NULL,balance_version integer NOT NULL,counted numeric(24,6) CHECK(counted>=0),unit_id uuid,quantity numeric(24,6),counted_by uuid REFERENCES auth_accounts(id),counted_at timestamptz,attempt integer NOT NULL DEFAULT 0,UNIQUE(business_id,count_id,variant_id),FOREIGN KEY(business_id,count_id) REFERENCES stock_counts(business_id,id),FOREIGN KEY(business_id,variant_id) REFERENCES catalog_variants(business_id,id),FOREIGN KEY(business_id,unit_id) REFERENCES catalog_units(business_id,id));
ALTER TABLE stock_movements DROP CONSTRAINT stock_movements_source_kind_check;
ALTER TABLE stock_movements ADD CONSTRAINT stock_movements_source_kind_check CHECK(source_kind IN ('manual','reservation','reservation_release','reversal','purchase_receipt','purchase_return','transfer_dispatch','transfer_receive','location_move','sale','sale_return','stock_count'));
CREATE TRIGGER sync_stock_counts AFTER INSERT OR UPDATE OR DELETE ON stock_counts FOR EACH ROW EXECUTE FUNCTION sync_changed();
-- Down Migration
DROP TRIGGER sync_stock_counts ON stock_counts;
DROP TABLE stock_count_lines,stock_counts;
-- Preserve immutable stock_count movement origins during development rollback.
