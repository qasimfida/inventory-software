-- Up Migration
CREATE TABLE staff_records (
 id uuid PRIMARY KEY, business_id uuid NOT NULL REFERENCES businesses(id), store_id uuid,
 code text NOT NULL, name text NOT NULL, title text NOT NULL,
 salary_minor numeric(24,0) NOT NULL CHECK(salary_minor>=0), currency text NOT NULL,
 state text NOT NULL CHECK(state IN ('active','inactive')), version integer NOT NULL DEFAULT 1 CHECK(version>0),
 UNIQUE(business_id,id), UNIQUE(business_id,code),
 FOREIGN KEY(business_id,store_id) REFERENCES stores(business_id,id)
);
CREATE TABLE operational_costs (
 id uuid PRIMARY KEY, business_id uuid NOT NULL REFERENCES businesses(id), store_id uuid, staff_id uuid,
 kind text NOT NULL CHECK(kind IN ('salary','expense')), description text NOT NULL, reference text NOT NULL,
 period_start date NOT NULL, period_end date NOT NULL CHECK(period_end>=period_start),
 amount_minor numeric(24,0) NOT NULL CHECK(amount_minor>0), currency text NOT NULL,
 actor_id uuid NOT NULL REFERENCES auth_accounts(id), created_at timestamptz NOT NULL DEFAULT now(),
 CHECK((kind='salary')=(staff_id IS NOT NULL)), UNIQUE(business_id,id), UNIQUE(business_id,reference),
 FOREIGN KEY(business_id,store_id) REFERENCES stores(business_id,id),
 FOREIGN KEY(business_id,staff_id) REFERENCES staff_records(business_id,id)
);
CREATE UNIQUE INDEX staff_salary_period ON operational_costs(business_id,staff_id,period_start,period_end) WHERE kind='salary';
CREATE TABLE operational_cost_payments (
 id uuid PRIMARY KEY, business_id uuid NOT NULL, cost_id uuid NOT NULL,
 amount_minor numeric(24,0) NOT NULL CHECK(amount_minor>0), reference text NOT NULL, paid_on date NOT NULL,
 actor_id uuid NOT NULL REFERENCES auth_accounts(id), created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(business_id,cost_id,reference), FOREIGN KEY(business_id,cost_id) REFERENCES operational_costs(business_id,id)
);
CREATE INDEX operational_cost_page ON operational_costs(business_id,created_at DESC,id);
CREATE INDEX operational_payment_cost ON operational_cost_payments(business_id,cost_id);
CREATE TRIGGER operational_cost_immutable BEFORE UPDATE OR DELETE ON operational_costs FOR EACH ROW EXECUTE FUNCTION organization_audit_immutable();
CREATE TRIGGER operational_payment_immutable BEFORE UPDATE OR DELETE ON operational_cost_payments FOR EACH ROW EXECUTE FUNCTION organization_audit_immutable();
-- Down Migration
DROP TABLE operational_cost_payments,operational_costs,staff_records;
