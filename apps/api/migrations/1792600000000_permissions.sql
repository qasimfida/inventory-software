-- Up Migration
ALTER TYPE membership_role RENAME TO old_membership_role;
CREATE TYPE membership_role AS ENUM ('owner','manager','cashier','viewer','custom');
ALTER TABLE business_memberships ALTER COLUMN role TYPE membership_role USING role::text::membership_role;
DROP TYPE old_membership_role;
ALTER TABLE business_memberships ADD COLUMN scope_store_id uuid, ADD COLUMN scope_warehouse_id uuid,
  ADD COLUMN permissions text[] NOT NULL DEFAULT '{}',
  ADD CONSTRAINT membership_scope_store FOREIGN KEY(business_id,scope_store_id) REFERENCES stores(business_id,id),
  ADD CONSTRAINT membership_scope_warehouse FOREIGN KEY(business_id,scope_store_id,scope_warehouse_id) REFERENCES warehouses(business_id,store_id,id),
  ADD CONSTRAINT membership_scope_valid CHECK ((scope_warehouse_id IS NULL OR scope_store_id IS NOT NULL) AND (role<>'owner' OR scope_store_id IS NULL)),
  ADD CONSTRAINT membership_permissions_valid CHECK (
    (role='custom' OR cardinality(permissions)=0) AND NOT ('users.write'=ANY(permissions)) AND
    permissions <@ ARRAY['business.read','business.write','locations.read','locations.write','products.read','products.write','stock.read','stock.write','sales.read','sales.write','purchases.read','purchases.write','customers.read','customers.write','payments.read','payments.write','reports.read','reports.write','users.read','audit.read']::text[] AND
    (scope_store_id IS NULL OR NOT (permissions && ARRAY['users.read','business.write']::text[])));
CREATE INDEX membership_store_scope ON business_memberships(business_id,scope_store_id);
ALTER TABLE organization_audit ADD COLUMN store_id uuid, ADD COLUMN warehouse_id uuid;
CREATE INDEX audit_store_scope ON organization_audit(business_id,store_id,id DESC);
CREATE INDEX audit_warehouse_scope ON organization_audit(business_id,warehouse_id,id DESC);
CREATE TABLE platform_administrators(account_id uuid PRIMARY KEY REFERENCES auth_accounts(id), created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE platform_audit(id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, actor_id uuid NOT NULL REFERENCES auth_accounts(id), target_id uuid NOT NULL REFERENCES auth_accounts(id), action text NOT NULL, occurred_at timestamptz NOT NULL DEFAULT now());
CREATE TRIGGER platform_audit_no_change BEFORE UPDATE OR DELETE ON platform_audit FOR EACH ROW EXECUTE FUNCTION organization_audit_immutable();
-- Down Migration
DROP TABLE platform_audit;
DROP TABLE platform_administrators;
DROP INDEX audit_warehouse_scope;
DROP INDEX audit_store_scope;
ALTER TABLE organization_audit DROP COLUMN warehouse_id, DROP COLUMN store_id;
ALTER TABLE business_memberships DROP COLUMN permissions, DROP COLUMN scope_warehouse_id, DROP COLUMN scope_store_id;
ALTER TYPE membership_role RENAME TO expanded_membership_role;
CREATE TYPE membership_role AS ENUM ('owner','manager','viewer');
ALTER TABLE business_memberships ALTER COLUMN role TYPE membership_role USING
  (CASE WHEN role::text IN ('cashier','custom') THEN 'viewer' ELSE role::text END)::membership_role;
DROP TYPE expanded_membership_role;
