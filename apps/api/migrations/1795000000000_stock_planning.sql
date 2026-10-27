-- Up Migration
CREATE TABLE stock_reason_codes (
 business_id uuid NOT NULL REFERENCES businesses(id), code text NOT NULL,
 label text NOT NULL CHECK(length(label) BETWEEN 2 AND 80), directions text[] NOT NULL,
 active boolean NOT NULL DEFAULT true, version integer NOT NULL DEFAULT 1 CHECK(version>0),
 PRIMARY KEY(business_id,code), CHECK(code ~ '^[a-z][a-z0-9_]{1,47}$'),
 CHECK(cardinality(directions)>0 AND directions <@ ARRAY['in','out','damage','restore']::text[])
);
ALTER TABLE stock_movements ADD COLUMN reason_code text, ADD COLUMN reason_label text;
CREATE TABLE stock_reorder_policies (
 business_id uuid NOT NULL,variant_id uuid NOT NULL,warehouse_id uuid NOT NULL,location_id uuid NOT NULL,
 reorder_point numeric(24,6) NOT NULL CHECK(reorder_point>=0),target_quantity numeric(24,6) NOT NULL,
 active boolean NOT NULL DEFAULT true,version integer NOT NULL DEFAULT 1 CHECK(version>0),
 PRIMARY KEY(business_id,variant_id,warehouse_id,location_id),
 FOREIGN KEY(business_id,variant_id) REFERENCES catalog_variants(business_id,id),
 FOREIGN KEY(business_id,warehouse_id,location_id) REFERENCES storage_locations(business_id,warehouse_id,id),
 CHECK(target_quantity>=reorder_point)
);
CREATE TABLE stock_hold_orders (
 id uuid PRIMARY KEY,business_id uuid NOT NULL REFERENCES businesses(id),warehouse_id uuid NOT NULL,
 reference text NOT NULL CHECK(length(reference) BETWEEN 2 AND 80), reservation_id uuid NOT NULL,
 state text NOT NULL DEFAULT 'open' CHECK(state IN ('open','cancelled','expired')),
 expires_at timestamptz NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),created_by uuid NOT NULL REFERENCES auth_accounts(id),
 UNIQUE(business_id,id),UNIQUE(business_id,reference),UNIQUE(business_id,reservation_id),
 FOREIGN KEY(business_id,reservation_id) REFERENCES stock_reservations(business_id,id),
 FOREIGN KEY(business_id,warehouse_id) REFERENCES warehouses(business_id,id),CHECK(expires_at>created_at)
);
CREATE INDEX stock_hold_expiry ON stock_hold_orders(expires_at,id) WHERE state='open';
CREATE INDEX stock_hold_warehouse ON stock_hold_orders(business_id,warehouse_id,created_at,id);
-- Down Migration
DROP TABLE stock_hold_orders;
DROP TABLE stock_reorder_policies;
ALTER TABLE stock_movements DROP COLUMN reason_label,DROP COLUMN reason_code;
DROP TABLE stock_reason_codes;
