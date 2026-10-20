-- Up Migration
CREATE TABLE catalog_categories(
 id uuid PRIMARY KEY,business_id uuid NOT NULL REFERENCES businesses(id),parent_id uuid,
 name text NOT NULL CHECK(length(trim(name)) BETWEEN 1 AND 120),state text NOT NULL CHECK(state IN ('active','inactive','archived')),
 version integer NOT NULL DEFAULT 1 CHECK(version>0),UNIQUE(business_id,id),
 FOREIGN KEY(business_id,parent_id) REFERENCES catalog_categories(business_id,id),CHECK(parent_id IS DISTINCT FROM id)
);
CREATE UNIQUE INDEX category_name ON catalog_categories(business_id,parent_id,lower(name)) NULLS NOT DISTINCT;
CREATE INDEX category_parent ON catalog_categories(business_id,parent_id);
CREATE TABLE catalog_products(
 id uuid PRIMARY KEY,business_id uuid NOT NULL REFERENCES businesses(id),name text NOT NULL CHECK(length(trim(name)) BETWEEN 1 AND 120),
 sku text NOT NULL,description text NOT NULL DEFAULT '',images jsonb NOT NULL DEFAULT '[]',category_id uuid,
 state text NOT NULL CHECK(state IN ('active','inactive','archived')),type text NOT NULL CHECK(type IN ('physical','service')),
 track_inventory boolean NOT NULL,CHECK(type<>'service' OR NOT track_inventory),version integer NOT NULL DEFAULT 1 CHECK(version>0),
 created_at timestamptz NOT NULL DEFAULT now(),UNIQUE(business_id,id),UNIQUE(business_id,sku),
 FOREIGN KEY(business_id,category_id) REFERENCES catalog_categories(business_id,id)
);
CREATE INDEX catalog_product_name ON catalog_products(business_id,lower(name),id);
CREATE INDEX catalog_product_created ON catalog_products(business_id,created_at,id);
CREATE INDEX catalog_product_category ON catalog_products(business_id,category_id,state);
CREATE TABLE catalog_identifiers(
 business_id uuid NOT NULL,product_id uuid NOT NULL,code text NOT NULL CHECK(code ~ '^[A-Z0-9][A-Z0-9_.:/-]{0,63}$'),
 kind text NOT NULL CHECK(kind IN ('sku','barcode','alternate')),PRIMARY KEY(business_id,code),
 FOREIGN KEY(business_id,product_id) REFERENCES catalog_products(business_id,id)
);
CREATE INDEX catalog_identifier_product ON catalog_identifiers(business_id,product_id);
-- Down Migration
DROP TABLE catalog_identifiers;
DROP TABLE catalog_products;
DROP TABLE catalog_categories;
