-- Up Migration
ALTER TABLE business_deliveries DROP CONSTRAINT business_deliveries_permission_check;
ALTER TABLE business_deliveries ADD CONSTRAINT business_deliveries_permission_check CHECK(permission IN ('business.write','purchases.read','purchases.write','stock.read','stock.write','sales.refund','sales.void','onlineStore.manage'));
ALTER TABLE business_memberships DROP CONSTRAINT membership_permissions_valid;
ALTER TABLE business_memberships ADD CONSTRAINT membership_permissions_valid CHECK((role='custom' OR cardinality(permissions)=0) AND NOT ('users.write'=ANY(permissions)) AND permissions <@ ARRAY['business.read','business.write','locations.read','locations.write','products.read','products.write','stock.read','stock.write','sales.read','sales.write','sales.refund','sales.void','purchases.read','purchases.write','customers.read','customers.write','customers.credit','customers.override','payments.read','payments.write','payments.cash','reports.read','reports.write','users.read','audit.read','onlineStore.manage','onlineStore.orders']::text[] AND (scope_store_id IS NULL OR NOT(permissions && ARRAY['users.read','business.write','onlineStore.manage']::text[])));
CREATE TABLE storefront_settings (
 business_id uuid PRIMARY KEY REFERENCES businesses(id),slug text UNIQUE NOT NULL CHECK(slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
 store_id uuid NOT NULL,settings jsonb NOT NULL,version integer NOT NULL DEFAULT 1 CHECK(version>0),
 actor_id uuid NOT NULL REFERENCES auth_accounts(id),dirty boolean NOT NULL DEFAULT true,next_check timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(business_id,store_id) REFERENCES stores(business_id,id)
);
CREATE TABLE channel_listings (
 id uuid PRIMARY KEY,business_id uuid NOT NULL REFERENCES storefront_settings(business_id),product_id uuid NOT NULL,
 overrides jsonb NOT NULL,
 published_at timestamptz,state text NOT NULL DEFAULT 'needs_changes' CHECK(state IN('needs_changes','ready','active','paused','delisted')),
 issues jsonb NOT NULL DEFAULT '[]',rule_version integer NOT NULL DEFAULT 1,projection jsonb,
 version integer NOT NULL DEFAULT 1 CHECK(version>0),UNIQUE(business_id,product_id),
 FOREIGN KEY(business_id,product_id) REFERENCES catalog_products(business_id,id)
);
CREATE INDEX storefront_due ON storefront_settings(next_check);
CREATE FUNCTION storefront_dirty() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 UPDATE storefront_settings SET dirty=true WHERE business_id=COALESCE(NEW.business_id,OLD.business_id);
 RETURN NULL;
END $$;
CREATE TRIGGER storefront_products AFTER INSERT OR UPDATE OR DELETE ON catalog_products FOR EACH ROW EXECUTE FUNCTION storefront_dirty();
CREATE TRIGGER storefront_variants AFTER INSERT OR UPDATE OR DELETE ON catalog_variants FOR EACH ROW EXECUTE FUNCTION storefront_dirty();
CREATE TRIGGER storefront_prices AFTER INSERT OR UPDATE OR DELETE ON price_entries FOR EACH ROW EXECUTE FUNCTION storefront_dirty();
CREATE TRIGGER storefront_balances AFTER INSERT OR UPDATE OR DELETE ON stock_balances FOR EACH ROW EXECUTE FUNCTION storefront_dirty();
-- Down Migration
DELETE FROM business_deliveries WHERE permission='onlineStore.manage';
ALTER TABLE business_deliveries DROP CONSTRAINT business_deliveries_permission_check;
ALTER TABLE business_deliveries ADD CONSTRAINT business_deliveries_permission_check CHECK(permission IN ('business.write','purchases.read','purchases.write','stock.read','stock.write','sales.refund','sales.void'));
UPDATE business_memberships SET permissions=array_remove(array_remove(permissions,'onlineStore.manage'),'onlineStore.orders');
ALTER TABLE business_memberships DROP CONSTRAINT membership_permissions_valid;
ALTER TABLE business_memberships ADD CONSTRAINT membership_permissions_valid CHECK((role='custom' OR cardinality(permissions)=0) AND NOT ('users.write'=ANY(permissions)) AND permissions <@ ARRAY['business.read','business.write','locations.read','locations.write','products.read','products.write','stock.read','stock.write','sales.read','sales.write','sales.refund','sales.void','purchases.read','purchases.write','customers.read','customers.write','customers.credit','customers.override','payments.read','payments.write','payments.cash','reports.read','reports.write','users.read','audit.read']::text[] AND (scope_store_id IS NULL OR NOT(permissions && ARRAY['users.read','business.write']::text[])));
DROP TRIGGER storefront_balances ON stock_balances;
DROP TRIGGER storefront_prices ON price_entries;
DROP TRIGGER storefront_variants ON catalog_variants;
DROP TRIGGER storefront_products ON catalog_products;
DROP FUNCTION storefront_dirty();
DROP TABLE channel_listings;
DROP TABLE storefront_settings;
