-- Up Migration
ALTER TABLE storage_locations ADD COLUMN notes text NOT NULL DEFAULT '',ADD COLUMN photos jsonb NOT NULL DEFAULT '[]',ADD COLUMN capacity numeric(24,6),ADD COLUMN capacity_unit text NOT NULL DEFAULT '',ADD CONSTRAINT storage_type CHECK(type IN ('warehouse','zone','aisle','rack','shelf','bin')),ADD CONSTRAINT storage_capacity CHECK(capacity IS NULL OR capacity>0),ADD CONSTRAINT storage_root CHECK((type='warehouse' AND id=warehouse_id AND parent_id IS NULL) OR (type<>'warehouse' AND id<>warehouse_id AND parent_id IS NOT NULL));
CREATE OR REPLACE FUNCTION storage_hierarchy_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE parent_type text;parent_state text;
BEGIN
 IF NEW.parent_id IS NOT NULL THEN
 SELECT type,state INTO parent_type,parent_state FROM storage_locations WHERE business_id=NEW.business_id AND warehouse_id=NEW.warehouse_id AND id=NEW.parent_id;
 IF parent_type IS NULL OR array_position(ARRAY['warehouse','zone','aisle','rack','shelf','bin'],parent_type)>=array_position(ARRAY['warehouse','zone','aisle','rack','shelf','bin'],NEW.type) OR (NEW.state='active' AND parent_state<>'active') THEN RAISE EXCEPTION 'Invalid hierarchy' USING ERRCODE='23514';END IF;
 END IF;
 IF TG_OP='UPDATE' THEN
 IF NEW.business_id<>OLD.business_id OR NEW.warehouse_id<>OLD.warehouse_id OR NEW.id<>OLD.id THEN RAISE EXCEPTION 'Immutable location ownership' USING ERRCODE='23514';END IF;
 IF EXISTS(SELECT 1 FROM storage_locations c WHERE c.business_id=NEW.business_id AND c.warehouse_id=NEW.warehouse_id AND c.parent_id=NEW.id AND (array_position(ARRAY['warehouse','zone','aisle','rack','shelf','bin'],c.type)<=array_position(ARRAY['warehouse','zone','aisle','rack','shelf','bin'],NEW.type) OR (NEW.state<>'active' AND c.state='active'))) THEN RAISE EXCEPTION 'Invalid children' USING ERRCODE='23514';END IF;
 IF NEW.state<>'active' AND EXISTS(SELECT 1 FROM stock_balances WHERE business_id=NEW.business_id AND location_id=NEW.id AND (on_hand<>0 OR reserved<>0 OR damaged<>0 OR in_transit<>0)) THEN RAISE EXCEPTION 'Nonempty location' USING ERRCODE='23514';END IF;
 END IF;
 RETURN NEW;
END;$$;
CREATE TRIGGER storage_hierarchy BEFORE INSERT OR UPDATE ON storage_locations FOR EACH ROW EXECUTE FUNCTION storage_hierarchy_guard();
-- Down Migration
DROP TRIGGER storage_hierarchy ON storage_locations;
DROP FUNCTION storage_hierarchy_guard();
ALTER TABLE storage_locations DROP CONSTRAINT storage_root,DROP CONSTRAINT storage_capacity,DROP CONSTRAINT storage_type,DROP COLUMN notes,DROP COLUMN photos,DROP COLUMN capacity,DROP COLUMN capacity_unit;
