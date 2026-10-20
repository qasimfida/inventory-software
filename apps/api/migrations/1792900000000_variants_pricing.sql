-- Up Migration
CREATE TABLE catalog_units(id uuid PRIMARY KEY,business_id uuid NOT NULL REFERENCES businesses(id),name text NOT NULL,code text NOT NULL,dimension text NOT NULL CHECK(dimension IN ('count','mass','volume','length')),UNIQUE(business_id,id),UNIQUE(business_id,code));
CREATE TABLE catalog_variants(id uuid PRIMARY KEY,business_id uuid NOT NULL,product_id uuid NOT NULL,name text NOT NULL,sku text NOT NULL,attributes jsonb NOT NULL DEFAULT '{}',
 base_unit_id uuid NOT NULL,purchase_unit_id uuid NOT NULL,sale_unit_id uuid NOT NULL,count_unit_id uuid NOT NULL,cost numeric(24,6) CHECK(cost>=0),cost_currency text NOT NULL DEFAULT 'USD' CHECK(cost_currency IN ('USD','EUR','GBP','PKR','JPY','KWD','CLF')),
 state text NOT NULL CHECK(state IN ('active','inactive','archived')),version integer NOT NULL DEFAULT 1 CHECK(version>0),is_default boolean NOT NULL DEFAULT false,
 UNIQUE(business_id,id),UNIQUE(business_id,product_id,id),UNIQUE(business_id,sku),UNIQUE(business_id,product_id,attributes),
 FOREIGN KEY(business_id,product_id) REFERENCES catalog_products(business_id,id),FOREIGN KEY(business_id,base_unit_id) REFERENCES catalog_units(business_id,id),
 FOREIGN KEY(business_id,purchase_unit_id) REFERENCES catalog_units(business_id,id),FOREIGN KEY(business_id,sale_unit_id) REFERENCES catalog_units(business_id,id),FOREIGN KEY(business_id,count_unit_id) REFERENCES catalog_units(business_id,id));
CREATE UNIQUE INDEX variant_default ON catalog_variants(business_id,product_id) WHERE is_default;
CREATE INDEX variant_product ON catalog_variants(business_id,product_id,state);
CREATE TABLE catalog_conversions(business_id uuid NOT NULL,variant_id uuid NOT NULL,unit_id uuid NOT NULL,numerator numeric(24,6) NOT NULL CHECK(numerator>0),denominator numeric(24,6) NOT NULL CHECK(denominator>0),PRIMARY KEY(business_id,variant_id,unit_id),
 FOREIGN KEY(business_id,variant_id) REFERENCES catalog_variants(business_id,id),FOREIGN KEY(business_id,unit_id) REFERENCES catalog_units(business_id,id));
ALTER TABLE catalog_identifiers ADD COLUMN variant_id uuid;
ALTER TABLE catalog_identifiers ADD CONSTRAINT identifier_variant FOREIGN KEY(business_id,product_id,variant_id) REFERENCES catalog_variants(business_id,product_id,id);
INSERT INTO catalog_units(id,business_id,name,code,dimension) SELECT gen_random_uuid(),id,'Each','EACH','count' FROM businesses;
INSERT INTO catalog_variants(id,business_id,product_id,name,sku,base_unit_id,purchase_unit_id,sale_unit_id,count_unit_id,state,is_default)
 SELECT p.id,p.business_id,p.id,p.name,p.sku,u.id,u.id,u.id,u.id,p.state,true FROM catalog_products p JOIN catalog_units u ON u.business_id=p.business_id AND u.code='EACH';
UPDATE catalog_identifiers SET variant_id=product_id;
CREATE TABLE price_entries(id uuid PRIMARY KEY,business_id uuid NOT NULL,variant_id uuid NOT NULL,store_id uuid,unit_price numeric(24,6) NOT NULL CHECK(unit_price>=0),currency text NOT NULL CHECK(currency IN ('USD','EUR','GBP','PKR','JPY','KWD','CLF')),
 tax_basis_points integer NOT NULL CHECK(tax_basis_points BETWEEN 0 AND 10000),tax_inclusive boolean NOT NULL,starts_at timestamptz NOT NULL,ends_at timestamptz,CHECK(ends_at IS NULL OR ends_at>starts_at),
 FOREIGN KEY(business_id,variant_id) REFERENCES catalog_variants(business_id,id),FOREIGN KEY(business_id,store_id) REFERENCES stores(business_id,id));
CREATE UNIQUE INDEX price_effective_unique ON price_entries(business_id,variant_id,store_id,starts_at) NULLS NOT DISTINCT;
CREATE INDEX price_lookup ON price_entries(business_id,variant_id,store_id,starts_at DESC);
CREATE TABLE price_promotions(id uuid PRIMARY KEY,business_id uuid NOT NULL,variant_id uuid NOT NULL,store_id uuid,name text NOT NULL,discount_basis_points integer NOT NULL CHECK(discount_basis_points BETWEEN 1 AND 10000),
 minimum_quantity numeric(24,6) NOT NULL CHECK(minimum_quantity>0),priority integer NOT NULL CHECK(priority BETWEEN 0 AND 1000),starts_at timestamptz NOT NULL,ends_at timestamptz,CHECK(ends_at IS NULL OR ends_at>starts_at),
 FOREIGN KEY(business_id,variant_id) REFERENCES catalog_variants(business_id,id),FOREIGN KEY(business_id,store_id) REFERENCES stores(business_id,id));
ALTER TABLE price_entries ADD UNIQUE(business_id,id);
ALTER TABLE price_promotions ADD UNIQUE(business_id,id);
CREATE INDEX promotion_lookup ON price_promotions(business_id,variant_id,store_id,starts_at DESC);
CREATE TRIGGER price_immutable BEFORE UPDATE OR DELETE ON price_entries FOR EACH ROW EXECUTE FUNCTION organization_audit_immutable();
CREATE TRIGGER promotion_immutable BEFORE UPDATE OR DELETE ON price_promotions FOR EACH ROW EXECUTE FUNCTION organization_audit_immutable();
CREATE TRIGGER conversion_immutable BEFORE UPDATE OR DELETE ON catalog_conversions FOR EACH ROW EXECUTE FUNCTION organization_audit_immutable();
CREATE TABLE promotion_withdrawals(business_id uuid NOT NULL,promotion_id uuid NOT NULL,actor_id uuid NOT NULL REFERENCES auth_accounts(id),created_at timestamptz NOT NULL DEFAULT now(),PRIMARY KEY(business_id,promotion_id),FOREIGN KEY(business_id,promotion_id) REFERENCES price_promotions(business_id,id));
CREATE TRIGGER withdrawal_immutable BEFORE UPDATE OR DELETE ON promotion_withdrawals FOR EACH ROW EXECUTE FUNCTION organization_audit_immutable();
-- Down Migration
DROP TABLE promotion_withdrawals;
DROP TABLE price_promotions;
DROP TABLE price_entries;
ALTER TABLE catalog_identifiers DROP CONSTRAINT identifier_variant;
ALTER TABLE catalog_identifiers DROP COLUMN variant_id;
DROP TABLE catalog_conversions;
DROP TABLE catalog_variants;
DROP TABLE catalog_units;
