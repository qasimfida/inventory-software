-- Up Migration
CREATE TABLE sync_heads(business_id uuid PRIMARY KEY REFERENCES businesses(id),revision bigint NOT NULL DEFAULT 0);
CREATE TABLE sync_changes(business_id uuid NOT NULL,revision bigint NOT NULL,topic text NOT NULL,variant_id uuid,store_id uuid,warehouse_id uuid,created_at timestamptz NOT NULL DEFAULT now(),PRIMARY KEY(business_id,revision));
CREATE FUNCTION sync_changed() RETURNS trigger LANGUAGE plpgsql AS $$ DECLARE data jsonb; rev bigint; b uuid; v uuid; BEGIN
 data=CASE WHEN TG_OP='DELETE' THEN to_jsonb(OLD) ELSE to_jsonb(NEW) END;b=(data->>'business_id')::uuid;
 INSERT INTO sync_heads(business_id,revision) VALUES(b,1) ON CONFLICT(business_id) DO UPDATE SET revision=sync_heads.revision+1 RETURNING revision INTO rev;
 v=CASE WHEN TG_TABLE_NAME='catalog_variants' THEN (data->>'id')::uuid ELSE (data->>'variant_id')::uuid END;
 INSERT INTO sync_changes(business_id,revision,topic,variant_id,store_id,warehouse_id) VALUES(b,rev,TG_TABLE_NAME,v,(data->>'store_id')::uuid,(data->>'warehouse_id')::uuid);RETURN COALESCE(NEW,OLD);END; $$;
CREATE TABLE offline_policies(business_id uuid PRIMARY KEY REFERENCES businesses(id),policy jsonb NOT NULL,version integer NOT NULL DEFAULT 1);
CREATE TABLE offline_leases(id uuid PRIMARY KEY,business_id uuid NOT NULL REFERENCES businesses(id),actor_id uuid NOT NULL REFERENCES auth_accounts(id),warehouse_id uuid NOT NULL,shift_id uuid NOT NULL,device_id uuid NOT NULL,currency text NOT NULL,access_hash text NOT NULL,policy jsonb NOT NULL,snapshot jsonb NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),expires_at timestamptz NOT NULL,UNIQUE(business_id,id),FOREIGN KEY(business_id,warehouse_id) REFERENCES warehouses(business_id,id),FOREIGN KEY(business_id,shift_id) REFERENCES cash_shifts(business_id,id));
CREATE INDEX offline_lease_actor ON offline_leases(business_id,actor_id,warehouse_id);
CREATE TABLE sync_cursors(id uuid PRIMARY KEY,business_id uuid NOT NULL,actor_id uuid NOT NULL,warehouse_id uuid NOT NULL,access_hash text NOT NULL,revision bigint NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),expires_at timestamptz NOT NULL);
CREATE INDEX sync_cursor_expiry ON sync_cursors(expires_at);
CREATE TABLE sync_operations(business_id uuid NOT NULL,id uuid NOT NULL,actor_id uuid NOT NULL,lease_id uuid NOT NULL,request_hash text NOT NULL,payload jsonb NOT NULL,state text NOT NULL CHECK(state IN ('synced','rejected','conflict')),result jsonb NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),reviewed_by uuid,review_note text,PRIMARY KEY(business_id,id),FOREIGN KEY(business_id,lease_id) REFERENCES offline_leases(business_id,id));
CREATE INDEX sync_operation_lease ON sync_operations(business_id,lease_id,state);
CREATE TRIGGER sync_catalog_products AFTER INSERT OR UPDATE OR DELETE ON catalog_products FOR EACH ROW EXECUTE FUNCTION sync_changed();
CREATE TRIGGER sync_catalog_variants AFTER INSERT OR UPDATE OR DELETE ON catalog_variants FOR EACH ROW EXECUTE FUNCTION sync_changed();
CREATE TRIGGER sync_catalog_identifiers AFTER INSERT OR UPDATE OR DELETE ON catalog_identifiers FOR EACH ROW EXECUTE FUNCTION sync_changed();
CREATE TRIGGER sync_catalog_conversions AFTER INSERT OR UPDATE OR DELETE ON catalog_conversions FOR EACH ROW EXECUTE FUNCTION sync_changed();
CREATE TRIGGER sync_price_entries AFTER INSERT OR UPDATE OR DELETE ON price_entries FOR EACH ROW EXECUTE FUNCTION sync_changed();
CREATE TRIGGER sync_price_promotions AFTER INSERT OR UPDATE OR DELETE ON price_promotions FOR EACH ROW EXECUTE FUNCTION sync_changed();
CREATE TRIGGER sync_promotion_withdrawals AFTER INSERT OR UPDATE OR DELETE ON promotion_withdrawals FOR EACH ROW EXECUTE FUNCTION sync_changed();
CREATE TRIGGER sync_stock_balances AFTER INSERT OR UPDATE OR DELETE ON stock_balances FOR EACH ROW EXECUTE FUNCTION sync_changed();
CREATE TRIGGER sync_storage_locations AFTER INSERT OR UPDATE OR DELETE ON storage_locations FOR EACH ROW EXECUTE FUNCTION sync_changed();
CREATE TRIGGER sync_warehouses AFTER INSERT OR UPDATE OR DELETE ON warehouses FOR EACH ROW EXECUTE FUNCTION sync_changed();
CREATE TRIGGER sync_stores AFTER INSERT OR UPDATE OR DELETE ON stores FOR EACH ROW EXECUTE FUNCTION sync_changed();
CREATE TRIGGER sync_terminals AFTER INSERT OR UPDATE OR DELETE ON terminals FOR EACH ROW EXECUTE FUNCTION sync_changed();
CREATE TRIGGER sync_sales AFTER INSERT OR UPDATE OR DELETE ON sales FOR EACH ROW EXECUTE FUNCTION sync_changed();
CREATE TRIGGER sync_cash_shifts AFTER INSERT OR UPDATE OR DELETE ON cash_shifts FOR EACH ROW EXECUTE FUNCTION sync_changed();
CREATE TRIGGER sync_purchase_orders AFTER INSERT OR UPDATE OR DELETE ON purchase_orders FOR EACH ROW EXECUTE FUNCTION sync_changed();
CREATE TRIGGER sync_stock_transfers AFTER INSERT OR UPDATE OR DELETE ON stock_transfers FOR EACH ROW EXECUTE FUNCTION sync_changed();
CREATE FUNCTION sync_operation_guard() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF TG_OP='DELETE' OR (to_jsonb(NEW)-ARRAY['state','result','reviewed_by','review_note']) IS DISTINCT FROM (to_jsonb(OLD)-ARRAY['state','result','reviewed_by','review_note']) THEN RAISE EXCEPTION 'Offline operation identity and payload are immutable' USING ERRCODE='23514'; END IF;
 IF OLD.state='synced' AND to_jsonb(NEW) IS DISTINCT FROM to_jsonb(OLD) THEN RAISE EXCEPTION 'Confirmed offline result is immutable' USING ERRCODE='23514'; END IF; RETURN NEW; END; $$;
CREATE TRIGGER sync_operation_immutable BEFORE UPDATE OR DELETE ON sync_operations FOR EACH ROW EXECUTE FUNCTION sync_operation_guard();
-- Down Migration
DROP TRIGGER sync_catalog_products ON catalog_products;
DROP TRIGGER sync_catalog_variants ON catalog_variants;
DROP TRIGGER sync_catalog_identifiers ON catalog_identifiers;
DROP TRIGGER sync_catalog_conversions ON catalog_conversions;
DROP TRIGGER sync_price_entries ON price_entries;
DROP TRIGGER sync_price_promotions ON price_promotions;
DROP TRIGGER sync_promotion_withdrawals ON promotion_withdrawals;
DROP TRIGGER sync_stock_balances ON stock_balances;
DROP TRIGGER sync_storage_locations ON storage_locations;
DROP TRIGGER sync_warehouses ON warehouses;
DROP TRIGGER sync_stores ON stores;
DROP TRIGGER sync_terminals ON terminals;
DROP TRIGGER sync_sales ON sales;
DROP TRIGGER sync_cash_shifts ON cash_shifts;
DROP TRIGGER sync_purchase_orders ON purchase_orders;
DROP TRIGGER sync_stock_transfers ON stock_transfers;
DROP TABLE sync_operations,sync_cursors,offline_leases,offline_policies,sync_changes,sync_heads;
DROP FUNCTION sync_changed();

DROP FUNCTION sync_operation_guard();
