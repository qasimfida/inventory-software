-- Up Migration
CREATE TYPE organization_state AS ENUM ('active', 'suspended', 'archived');
CREATE TYPE membership_role AS ENUM ('owner', 'manager', 'viewer');
CREATE TABLE businesses (
  id uuid PRIMARY KEY, name text NOT NULL CHECK(length(trim(name)) BETWEEN 1 AND 120),
  state organization_state NOT NULL DEFAULT 'active', version integer NOT NULL DEFAULT 1 CHECK(version>0),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE business_memberships (
  business_id uuid NOT NULL REFERENCES businesses(id), account_id uuid NOT NULL REFERENCES auth_accounts(id),
  role membership_role NOT NULL, state organization_state NOT NULL DEFAULT 'active',
  version integer NOT NULL DEFAULT 1 CHECK(version>0), created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(business_id,account_id)
);
CREATE INDEX membership_account_business ON business_memberships(account_id,business_id) WHERE state='active';
CREATE TABLE stores (
  id uuid PRIMARY KEY, business_id uuid NOT NULL REFERENCES businesses(id),
  name text NOT NULL CHECK(length(trim(name)) BETWEEN 1 AND 120), code text NOT NULL CHECK(code ~ '^[A-Z0-9_-]{1,32}$'),
  type text NOT NULL CHECK(type IN ('store','branch')), state organization_state NOT NULL DEFAULT 'active',
  version integer NOT NULL DEFAULT 1 CHECK(version>0), UNIQUE(business_id,id), UNIQUE(business_id,code)
);
CREATE TABLE warehouses (
  id uuid PRIMARY KEY, business_id uuid NOT NULL REFERENCES businesses(id), store_id uuid NOT NULL,
  name text NOT NULL CHECK(length(trim(name)) BETWEEN 1 AND 120), code text NOT NULL CHECK(code ~ '^[A-Z0-9_-]{1,32}$'),
  state organization_state NOT NULL DEFAULT 'active', version integer NOT NULL DEFAULT 1 CHECK(version>0),
  FOREIGN KEY(business_id,store_id) REFERENCES stores(business_id,id),
  UNIQUE(business_id,store_id,id), UNIQUE(business_id,code)
);
CREATE INDEX warehouse_parent ON warehouses(business_id,store_id);
CREATE TABLE terminals (
  id uuid PRIMARY KEY, business_id uuid NOT NULL REFERENCES businesses(id), store_id uuid NOT NULL, warehouse_id uuid,
  name text NOT NULL CHECK(length(trim(name)) BETWEEN 1 AND 120), code text NOT NULL CHECK(code ~ '^[A-Z0-9_-]{1,32}$'),
  type text NOT NULL CHECK(type IN ('pos','desktop','mobile')), state organization_state NOT NULL DEFAULT 'active',
  version integer NOT NULL DEFAULT 1 CHECK(version>0),
  FOREIGN KEY(business_id,store_id) REFERENCES stores(business_id,id),
  FOREIGN KEY(business_id,store_id,warehouse_id) REFERENCES warehouses(business_id,store_id,id),
  UNIQUE(business_id,code)
);
CREATE INDEX terminal_store ON terminals(business_id,store_id);
CREATE INDEX terminal_warehouse ON terminals(business_id,store_id,warehouse_id);
CREATE TABLE organization_audit (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, business_id uuid NOT NULL REFERENCES businesses(id),
  actor_id uuid NOT NULL REFERENCES auth_accounts(id), resource_id uuid NOT NULL, action text NOT NULL,
  request_id uuid NOT NULL, before_data jsonb, after_data jsonb NOT NULL, occurred_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX organization_audit_business ON organization_audit(business_id,id DESC);
CREATE FUNCTION organization_audit_immutable() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'Organization audit records are append-only'; END; $$;
CREATE TRIGGER organization_audit_no_change BEFORE UPDATE OR DELETE ON organization_audit
  FOR EACH ROW EXECUTE FUNCTION organization_audit_immutable();
-- Down Migration
DROP TABLE organization_audit;
DROP FUNCTION organization_audit_immutable();
DROP TABLE terminals;
DROP TABLE warehouses;
DROP TABLE stores;
DROP TABLE business_memberships;
DROP TABLE businesses;
DROP TYPE membership_role;
DROP TYPE organization_state;
