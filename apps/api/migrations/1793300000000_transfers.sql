-- Up Migration
ALTER TABLE stock_reservations ADD CONSTRAINT reservation_tenant_id UNIQUE(business_id,id);
CREATE TABLE stock_transfers(id uuid PRIMARY KEY,business_id uuid NOT NULL,source_warehouse_id uuid NOT NULL,source_location_id uuid NOT NULL,destination_warehouse_id uuid NOT NULL,destination_location_id uuid NOT NULL,reference text NOT NULL,state text NOT NULL CHECK(state IN ('draft','approved','dispatched','partially_received','completed','cancelled')),version integer NOT NULL DEFAULT 1,actor_id uuid NOT NULL REFERENCES auth_accounts(id),created_at timestamptz NOT NULL DEFAULT now(),UNIQUE(business_id,id),UNIQUE(business_id,reference),CHECK(source_location_id<>destination_location_id),FOREIGN KEY(business_id,source_warehouse_id,source_location_id) REFERENCES storage_locations(business_id,warehouse_id,id),FOREIGN KEY(business_id,destination_warehouse_id,destination_location_id) REFERENCES storage_locations(business_id,warehouse_id,id));
CREATE INDEX transfer_source ON stock_transfers(business_id,source_warehouse_id,created_at,id);
CREATE INDEX transfer_destination ON stock_transfers(business_id,destination_warehouse_id,created_at,id);
CREATE TABLE transfer_lines(id uuid PRIMARY KEY,business_id uuid NOT NULL,transfer_id uuid NOT NULL,variant_id uuid NOT NULL,unit_id uuid NOT NULL,quantity numeric(24,6) NOT NULL CHECK(quantity>0),base_quantity numeric(24,6) NOT NULL CHECK(base_quantity>0),settled numeric(24,6) NOT NULL DEFAULT 0 CHECK(settled>=0 AND settled<=base_quantity),reservation_id uuid,UNIQUE(business_id,id),UNIQUE(business_id,transfer_id,variant_id),FOREIGN KEY(business_id,reservation_id) REFERENCES stock_reservations(business_id,id),FOREIGN KEY(business_id,transfer_id) REFERENCES stock_transfers(business_id,id),FOREIGN KEY(business_id,variant_id) REFERENCES catalog_variants(business_id,id),FOREIGN KEY(business_id,unit_id) REFERENCES catalog_units(business_id,id));
CREATE TABLE transfer_events(id uuid PRIMARY KEY,business_id uuid NOT NULL,transfer_id uuid NOT NULL,action text NOT NULL,actor_id uuid NOT NULL REFERENCES auth_accounts(id),reason text NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),FOREIGN KEY(business_id,transfer_id) REFERENCES stock_transfers(business_id,id));
CREATE INDEX transfer_event_order ON transfer_events(business_id,transfer_id,created_at,id);
CREATE TABLE transfer_receipts(id uuid PRIMARY KEY,business_id uuid NOT NULL,line_id uuid NOT NULL,received numeric(24,6) NOT NULL CHECK(received>=0),damaged numeric(24,6) NOT NULL CHECK(damaged>=0),shortage numeric(24,6) NOT NULL CHECK(shortage>=0),actor_id uuid NOT NULL REFERENCES auth_accounts(id),reason text NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),CHECK(received+damaged+shortage>0),FOREIGN KEY(business_id,line_id) REFERENCES transfer_lines(business_id,id));
CREATE INDEX transfer_receipt_line ON transfer_receipts(business_id,line_id,created_at,id);
CREATE TRIGGER transfer_event_immutable BEFORE UPDATE OR DELETE ON transfer_events FOR EACH ROW EXECUTE FUNCTION organization_audit_immutable();
CREATE TRIGGER transfer_receipt_immutable BEFORE UPDATE OR DELETE ON transfer_receipts FOR EACH ROW EXECUTE FUNCTION organization_audit_immutable();
CREATE FUNCTION transfer_lines_history_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF (SELECT state FROM stock_transfers WHERE business_id=OLD.business_id AND id=OLD.transfer_id)<>'draft' THEN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Posted lines cannot be deleted' USING ERRCODE='23514'; END IF;
 IF ROW(NEW.business_id,NEW.transfer_id,NEW.variant_id,NEW.unit_id,NEW.quantity,NEW.base_quantity) IS DISTINCT FROM ROW(OLD.business_id,OLD.transfer_id,OLD.variant_id,OLD.unit_id,OLD.quantity,OLD.base_quantity) THEN RAISE EXCEPTION 'Posted line identity and quantities are immutable' USING ERRCODE='23514'; END IF;
 END IF;
 IF TG_OP='DELETE' THEN RETURN OLD; END IF; RETURN NEW;
END;$$;
CREATE TRIGGER transfer_lines_history_guard BEFORE UPDATE OR DELETE ON transfer_lines FOR EACH ROW EXECUTE FUNCTION transfer_lines_history_guard();
-- Down Migration
DROP TABLE transfer_receipts,transfer_events,transfer_lines,stock_transfers;

ALTER TABLE stock_reservations DROP CONSTRAINT reservation_tenant_id;

DROP FUNCTION transfer_lines_history_guard();
