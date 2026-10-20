-- Up Migration
ALTER TABLE warehouses ADD CONSTRAINT warehouse_tenant_id UNIQUE(business_id,id);
CREATE TABLE storage_locations(id uuid PRIMARY KEY,business_id uuid NOT NULL,warehouse_id uuid NOT NULL,parent_id uuid,
 name text NOT NULL,code text NOT NULL,type text NOT NULL DEFAULT 'warehouse',state text NOT NULL DEFAULT 'active' CHECK(state IN ('active','inactive','archived')),version integer NOT NULL DEFAULT 1 CHECK(version>0),
 UNIQUE(business_id,warehouse_id,id),UNIQUE(business_id,warehouse_id,code),
 FOREIGN KEY(business_id,warehouse_id) REFERENCES warehouses(business_id,id),
 FOREIGN KEY(business_id,warehouse_id,parent_id) REFERENCES storage_locations(business_id,warehouse_id,id),CHECK(parent_id IS DISTINCT FROM id));
CREATE INDEX storage_parent ON storage_locations(business_id,warehouse_id,parent_id);
INSERT INTO storage_locations(id,business_id,warehouse_id,name,code) SELECT id,business_id,id,name,'ROOT' FROM warehouses;
CREATE TABLE inventory_policies(business_id uuid PRIMARY KEY REFERENCES businesses(id),allow_negative boolean NOT NULL DEFAULT false,version integer NOT NULL DEFAULT 1 CHECK(version>0));
CREATE TABLE stock_balances(business_id uuid NOT NULL,variant_id uuid NOT NULL,warehouse_id uuid NOT NULL,location_id uuid NOT NULL,
 on_hand numeric(24,6) NOT NULL DEFAULT 0,reserved numeric(24,6) NOT NULL DEFAULT 0 CHECK(reserved>=0),damaged numeric(24,6) NOT NULL DEFAULT 0 CHECK(damaged>=0),in_transit numeric(24,6) NOT NULL DEFAULT 0 CHECK(in_transit>=0),version integer NOT NULL DEFAULT 1 CHECK(version>0),
 PRIMARY KEY(business_id,variant_id,warehouse_id,location_id),FOREIGN KEY(business_id,variant_id) REFERENCES catalog_variants(business_id,id),FOREIGN KEY(business_id,warehouse_id,location_id) REFERENCES storage_locations(business_id,warehouse_id,id),
 CHECK(on_hand>=reserved+damaged OR (on_hand<0 AND reserved=0 AND damaged=0)));
CREATE INDEX balance_warehouse ON stock_balances(business_id,warehouse_id,location_id,variant_id);
CREATE TABLE stock_movements(id uuid PRIMARY KEY,sequence bigint GENERATED ALWAYS AS IDENTITY UNIQUE,business_id uuid NOT NULL,variant_id uuid NOT NULL,warehouse_id uuid NOT NULL,location_id uuid NOT NULL,
 quantity_delta numeric(24,6) NOT NULL,reserved_delta numeric(24,6) NOT NULL DEFAULT 0,damaged_delta numeric(24,6) NOT NULL DEFAULT 0,transit_delta numeric(24,6) NOT NULL DEFAULT 0,
 type text NOT NULL CHECK(type IN ('opening','receive','sale','return','adjustment_in','adjustment_out','damage','restore','reserve','release','reversal','purchase_receive','purchase_return','transfer_dispatch','transfer_receive','transfer_damage','transfer_shortage','location_out','location_in')),source_kind text NOT NULL CHECK(source_kind IN ('manual','reservation','reservation_release','reversal','purchase_receipt','purchase_return','transfer_dispatch','transfer_receive','location_move')),source_id uuid NOT NULL,command_id uuid NOT NULL,actor_id uuid NOT NULL REFERENCES auth_accounts(id),reason text NOT NULL,reversal_of uuid UNIQUE,created_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(business_id,variant_id) REFERENCES catalog_variants(business_id,id),FOREIGN KEY(business_id,warehouse_id,location_id) REFERENCES storage_locations(business_id,warehouse_id,id),
 CHECK(quantity_delta<>0 OR reserved_delta<>0 OR damaged_delta<>0 OR transit_delta<>0),UNIQUE(business_id,source_kind,source_id,variant_id,warehouse_id,location_id,type),UNIQUE(business_id,id),FOREIGN KEY(business_id,reversal_of) REFERENCES stock_movements(business_id,id));
CREATE INDEX movement_scope_sequence ON stock_movements(business_id,warehouse_id,sequence DESC);
CREATE INDEX movement_balance ON stock_movements(business_id,variant_id,warehouse_id,location_id);
CREATE TRIGGER movement_immutable BEFORE UPDATE OR DELETE ON stock_movements FOR EACH ROW EXECUTE FUNCTION organization_audit_immutable();
CREATE TABLE stock_reservations(id uuid PRIMARY KEY,business_id uuid NOT NULL,variant_id uuid NOT NULL,warehouse_id uuid NOT NULL,location_id uuid NOT NULL,
 quantity numeric(24,6) NOT NULL CHECK(quantity>0),remaining numeric(24,6) NOT NULL CHECK(remaining>=0 AND remaining<=quantity),state text NOT NULL CHECK(state IN ('active','released','consumed')),source_kind text NOT NULL,source_id uuid NOT NULL,actor_id uuid NOT NULL REFERENCES auth_accounts(id),created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(business_id,id),FOREIGN KEY(business_id,variant_id) REFERENCES catalog_variants(business_id,id),FOREIGN KEY(business_id,warehouse_id,location_id) REFERENCES storage_locations(business_id,warehouse_id,id));
CREATE INDEX reservation_scope ON stock_reservations(business_id,warehouse_id,state);
CREATE FUNCTION catalog_stock_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF (OLD.track_inventory IS DISTINCT FROM NEW.track_inventory OR OLD.type IS DISTINCT FROM NEW.type) AND EXISTS(SELECT 1 FROM stock_movements m JOIN catalog_variants v ON v.business_id=m.business_id AND v.id=m.variant_id WHERE v.business_id=OLD.business_id AND v.product_id=OLD.id) THEN RAISE EXCEPTION 'Posted stock fixes inventory tracking semantics' USING ERRCODE='23514'; END IF;
 IF NEW.state='archived' AND EXISTS(SELECT 1 FROM stock_balances b JOIN catalog_variants v ON v.business_id=b.business_id AND v.id=b.variant_id WHERE v.business_id=OLD.business_id AND v.product_id=OLD.id AND (b.on_hand<>0 OR b.reserved<>0 OR b.damaged<>0 OR b.in_transit<>0)) THEN RAISE EXCEPTION 'Clear stock before archiving' USING ERRCODE='23514'; END IF;
 RETURN NEW;
END; $$;
CREATE TRIGGER product_stock_guard BEFORE UPDATE ON catalog_products FOR EACH ROW EXECUTE FUNCTION catalog_stock_guard();
CREATE FUNCTION stock_archive_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NEW.state='archived' AND EXISTS(SELECT 1 FROM stock_balances b WHERE b.business_id=OLD.business_id AND ((TG_TABLE_NAME='warehouses' AND b.warehouse_id=OLD.id) OR (TG_TABLE_NAME='catalog_variants' AND b.variant_id=OLD.id) OR (TG_TABLE_NAME='storage_locations' AND b.location_id=OLD.id)) AND (b.on_hand<>0 OR b.reserved<>0 OR b.damaged<>0 OR b.in_transit<>0)) THEN RAISE EXCEPTION 'Clear stock before archiving' USING ERRCODE='23514'; END IF;
 RETURN NEW;
END; $$;
CREATE TRIGGER warehouse_stock_guard BEFORE UPDATE ON warehouses FOR EACH ROW EXECUTE FUNCTION stock_archive_guard();
CREATE TRIGGER variant_stock_guard BEFORE UPDATE ON catalog_variants FOR EACH ROW EXECUTE FUNCTION stock_archive_guard();
CREATE TRIGGER location_stock_guard BEFORE UPDATE ON storage_locations FOR EACH ROW EXECUTE FUNCTION stock_archive_guard();
CREATE FUNCTION business_stock_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NEW.state='archived' AND EXISTS(SELECT 1 FROM stock_balances WHERE business_id=OLD.id AND (on_hand<>0 OR reserved<>0 OR damaged<>0 OR in_transit<>0)) THEN RAISE EXCEPTION 'Clear stock before archiving' USING ERRCODE='23514'; END IF;
 RETURN NEW;
END; $$;
CREATE TRIGGER business_stock_guard BEFORE UPDATE ON businesses FOR EACH ROW EXECUTE FUNCTION business_stock_guard();
-- Down Migration
DROP TRIGGER business_stock_guard ON businesses;
DROP FUNCTION business_stock_guard();
DROP TRIGGER location_stock_guard ON storage_locations;
DROP TRIGGER variant_stock_guard ON catalog_variants;
DROP TRIGGER warehouse_stock_guard ON warehouses;
DROP FUNCTION stock_archive_guard();
DROP TRIGGER product_stock_guard ON catalog_products;
DROP FUNCTION catalog_stock_guard();
DROP TABLE stock_reservations;
DROP TABLE stock_movements;
DROP TABLE stock_balances;
DROP TABLE inventory_policies;
DROP TABLE storage_locations;
ALTER TABLE warehouses DROP CONSTRAINT warehouse_tenant_id;
