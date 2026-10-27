-- Up Migration
ALTER TABLE channel_listings DROP CONSTRAINT channel_listings_business_id_fkey;
ALTER TABLE storefront_settings DROP CONSTRAINT storefront_settings_pkey;
ALTER TABLE storefront_settings ADD PRIMARY KEY(business_id,store_id);
ALTER TABLE storefront_settings ADD COLUMN management jsonb;
ALTER TABLE storefront_settings ADD COLUMN next_full_check timestamptz NOT NULL DEFAULT now();
ALTER TABLE channel_listings ADD COLUMN store_id uuid;
UPDATE channel_listings l SET store_id=s.store_id FROM storefront_settings s WHERE s.business_id=l.business_id;
ALTER TABLE channel_listings ALTER COLUMN store_id SET NOT NULL;
ALTER TABLE channel_listings ADD FOREIGN KEY(business_id,store_id) REFERENCES storefront_settings(business_id,store_id);
ALTER TABLE channel_listings ADD COLUMN variant_id uuid;
ALTER TABLE channel_listings ADD FOREIGN KEY(business_id,variant_id) REFERENCES catalog_variants(business_id,id);
ALTER TABLE channel_listings DROP CONSTRAINT channel_listings_business_id_product_id_key;
CREATE UNIQUE INDEX channel_listing_selection ON channel_listings(store_id,product_id,COALESCE(variant_id,'00000000-0000-0000-0000-000000000000'::uuid));
ALTER TABLE channel_listings DROP CONSTRAINT channel_listings_state_check;
ALTER TABLE channel_listings ADD CHECK(state IN('selected','needs_changes','ready','active','paused','delisted'));
ALTER TABLE channel_listings ADD COLUMN structured_issues jsonb NOT NULL DEFAULT '[]';
ALTER TABLE channel_listings ADD COLUMN online_overrides jsonb NOT NULL DEFAULT '{"title":null,"description":null,"images":null,"price":null,"visible":true}';
ALTER TABLE channel_listings ADD COLUMN paused_at timestamptz;
ALTER TABLE channel_listings ADD COLUMN last_validated_at timestamptz;
ALTER TABLE channel_listings ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now();
CREATE INDEX channel_listing_status ON channel_listings(business_id,store_id,state,id);
ALTER TABLE channel_listings ADD UNIQUE(business_id,store_id,id);
CREATE TABLE listing_events(
 id bigserial PRIMARY KEY,business_id uuid NOT NULL,store_id uuid NOT NULL,listing_id uuid NOT NULL,
 actor_id uuid REFERENCES auth_accounts(id),transition text NOT NULL,reason_code text NOT NULL,
 before_data jsonb NOT NULL,after_data jsonb NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(business_id,store_id) REFERENCES storefront_settings(business_id,store_id),
 FOREIGN KEY(business_id,store_id,listing_id) REFERENCES channel_listings(business_id,store_id,id)
);
CREATE TRIGGER listing_events_immutable BEFORE UPDATE OR DELETE ON listing_events FOR EACH ROW EXECUTE FUNCTION organization_audit_immutable();
CREATE INDEX listing_history ON listing_events(business_id,store_id,listing_id,id);
-- Durable product-deduplicated intents, committed with the source mutation.
CREATE TABLE storefront_revalidation(
 business_id uuid NOT NULL,store_id uuid NOT NULL,product_id uuid NOT NULL,
 due_at timestamptz NOT NULL DEFAULT now(),reason text NOT NULL,
 PRIMARY KEY(business_id,store_id,product_id),
 FOREIGN KEY(business_id,store_id) REFERENCES storefront_settings(business_id,store_id)
);
CREATE OR REPLACE FUNCTION storefront_dirty() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE b uuid; p uuid; data jsonb;
BEGIN
 data=COALESCE(to_jsonb(NEW),to_jsonb(OLD)); b=(data->>'business_id')::uuid;
 IF TG_TABLE_NAME='catalog_products' THEN p=(data->>'id')::uuid;
 ELSIF TG_TABLE_NAME='catalog_variants' THEN p=(data->>'product_id')::uuid;
 ELSIF data ? 'variant_id' THEN SELECT product_id INTO p FROM catalog_variants WHERE business_id=b AND id=(data->>'variant_id')::uuid;
 END IF;
 INSERT INTO storefront_revalidation(business_id,store_id,product_id,reason)
 SELECT DISTINCT l.business_id,l.store_id,l.product_id,TG_TABLE_NAME FROM channel_listings l
 WHERE l.business_id=b AND l.state<>'delisted' AND (p IS NULL OR l.product_id=p)
 ON CONFLICT(business_id,store_id,product_id) DO UPDATE SET reason=excluded.reason;
 UPDATE storefront_settings SET dirty=true,next_check=LEAST(next_check,now()+interval '1 second') WHERE business_id=b;
 RETURN NULL;
END $$;
CREATE TRIGGER storefront_categories AFTER INSERT OR UPDATE OR DELETE ON catalog_categories FOR EACH ROW EXECUTE FUNCTION storefront_dirty();
CREATE TRIGGER storefront_units AFTER INSERT OR UPDATE OR DELETE ON catalog_units FOR EACH ROW EXECUTE FUNCTION storefront_dirty();
CREATE TRIGGER storefront_warehouses AFTER INSERT OR UPDATE OR DELETE ON warehouses FOR EACH ROW EXECUTE FUNCTION storefront_dirty();
CREATE TRIGGER storefront_stores AFTER INSERT OR UPDATE OR DELETE ON stores FOR EACH ROW EXECUTE FUNCTION storefront_dirty();
CREATE TRIGGER storefront_promotions AFTER INSERT OR UPDATE OR DELETE ON price_promotions FOR EACH ROW EXECUTE FUNCTION storefront_dirty();
CREATE TRIGGER storefront_withdrawals AFTER INSERT OR UPDATE OR DELETE ON promotion_withdrawals FOR EACH ROW EXECUTE FUNCTION storefront_dirty();
ALTER TABLE business_memberships DROP CONSTRAINT membership_permissions_valid;
ALTER TABLE business_memberships ADD CONSTRAINT membership_permissions_valid CHECK((role='custom' OR cardinality(permissions)=0) AND NOT ('users.write'=ANY(permissions)) AND permissions <@ ARRAY['business.read','business.write','locations.read','locations.write','products.read','products.write','stock.read','stock.write','sales.read','sales.write','sales.refund','sales.void','purchases.read','purchases.write','customers.read','customers.write','customers.credit','customers.override','payments.read','payments.write','payments.cash','reports.read','reports.write','users.read','audit.read','onlineStore.view','onlineStore.manage','onlineStore.orders']::text[] AND (scope_store_id IS NULL OR NOT(permissions && ARRAY['users.read','business.write','onlineStore.manage']::text[])));
CREATE TRIGGER storefront_policy AFTER INSERT OR UPDATE OR DELETE ON settings_policies FOR EACH ROW EXECUTE FUNCTION storefront_dirty();
CREATE TRIGGER storefront_reorder AFTER INSERT OR UPDATE OR DELETE ON stock_reorder_policies FOR EACH ROW EXECUTE FUNCTION storefront_dirty();
-- Down Migration
DROP TRIGGER storefront_reorder ON stock_reorder_policies;
DROP TRIGGER storefront_policy ON settings_policies;
UPDATE business_memberships SET permissions=array_remove(permissions,'onlineStore.view');
DROP TRIGGER storefront_withdrawals ON promotion_withdrawals;
DROP TRIGGER storefront_promotions ON price_promotions;
DROP TRIGGER storefront_stores ON stores;
DROP TRIGGER storefront_warehouses ON warehouses;
DROP TRIGGER storefront_units ON catalog_units;
DROP TRIGGER storefront_categories ON catalog_categories;
DROP TABLE storefront_revalidation;
DROP TABLE listing_events;
-- Refuse lossy downgrade when more than one store or variant selection exists.
ALTER TABLE channel_listings ADD UNIQUE(business_id,product_id);
ALTER TABLE channel_listings DROP COLUMN updated_at,DROP COLUMN last_validated_at,DROP COLUMN paused_at,DROP COLUMN online_overrides,DROP COLUMN structured_issues,DROP COLUMN variant_id,DROP COLUMN store_id;
ALTER TABLE storefront_settings DROP CONSTRAINT storefront_settings_pkey;
ALTER TABLE storefront_settings ADD PRIMARY KEY(business_id);
ALTER TABLE storefront_settings DROP COLUMN management,DROP COLUMN next_full_check;
ALTER TABLE channel_listings ADD FOREIGN KEY(business_id) REFERENCES storefront_settings(business_id);
CREATE OR REPLACE FUNCTION storefront_dirty() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 UPDATE storefront_settings SET dirty=true WHERE business_id=COALESCE(NEW.business_id,OLD.business_id); RETURN NULL;
END $$;
