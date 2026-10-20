-- Up Migration
ALTER TABLE terminals ADD CONSTRAINT terminal_business_unique UNIQUE(business_id,id);
CREATE TABLE cash_shifts(id uuid PRIMARY KEY,business_id uuid NOT NULL,warehouse_id uuid NOT NULL,terminal_id uuid NOT NULL,actor_id uuid NOT NULL REFERENCES auth_accounts(id),currency text NOT NULL,opening_minor numeric(24,0) NOT NULL CHECK(opening_minor>=0),state text NOT NULL DEFAULT 'open' CHECK(state IN ('open','closed')),expected_minor numeric(24,0),counted_minor numeric(24,0) CHECK(counted_minor>=0),closed_by uuid REFERENCES auth_accounts(id),opened_at timestamptz NOT NULL DEFAULT now(),closed_at timestamptz,UNIQUE(business_id,id),FOREIGN KEY(business_id,warehouse_id) REFERENCES warehouses(business_id,id),FOREIGN KEY(business_id,terminal_id) REFERENCES terminals(business_id,id),CHECK((state='open' AND closed_at IS NULL AND counted_minor IS NULL AND expected_minor IS NULL) OR (state='closed' AND closed_at IS NOT NULL AND counted_minor IS NOT NULL AND expected_minor IS NOT NULL AND closed_by IS NOT NULL)));
CREATE UNIQUE INDEX one_shift_terminal ON cash_shifts(business_id,terminal_id) WHERE state='open';
CREATE UNIQUE INDEX one_shift_cashier ON cash_shifts(business_id,actor_id) WHERE state='open';
CREATE INDEX shift_scope ON cash_shifts(business_id,warehouse_id,opened_at DESC);
CREATE FUNCTION shift_history_guard() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Cash shifts cannot be deleted' USING ERRCODE='23514'; END IF;
 IF OLD.state='closed' OR NEW.state<>'closed' OR (to_jsonb(NEW)-ARRAY['state','expected_minor','counted_minor','closed_by','closed_at']) IS DISTINCT FROM (to_jsonb(OLD)-ARRAY['state','expected_minor','counted_minor','closed_by','closed_at']) THEN RAISE EXCEPTION 'Invalid shift correction' USING ERRCODE='23514'; END IF; RETURN NEW; END; $$;
CREATE TRIGGER shift_history BEFORE UPDATE OR DELETE ON cash_shifts FOR EACH ROW EXECUTE FUNCTION shift_history_guard();
ALTER TABLE cash_payments ADD COLUMN shift_id uuid, ADD CONSTRAINT payment_shift FOREIGN KEY(business_id,shift_id) REFERENCES cash_shifts(business_id,id);
CREATE TABLE cash_entries(id uuid PRIMARY KEY,business_id uuid NOT NULL,shift_id uuid NOT NULL,amount_minor numeric(24,0) NOT NULL CHECK(amount_minor<>0),kind text NOT NULL CHECK(kind IN ('payment','refund','cash_in','cash_out')),source_id uuid NOT NULL,reference text NOT NULL,actor_id uuid NOT NULL REFERENCES auth_accounts(id),created_at timestamptz NOT NULL DEFAULT now(),UNIQUE(business_id,id),UNIQUE(business_id,kind,source_id),FOREIGN KEY(business_id,shift_id) REFERENCES cash_shifts(business_id,id));
CREATE INDEX cash_entry_shift ON cash_entries(business_id,shift_id,created_at,id);
CREATE TRIGGER cash_entry_immutable BEFORE UPDATE OR DELETE ON cash_entries FOR EACH ROW EXECUTE FUNCTION organization_audit_immutable();
-- Down Migration
DROP TABLE cash_entries;
ALTER TABLE cash_payments DROP CONSTRAINT payment_shift,DROP COLUMN shift_id;
DROP TABLE cash_shifts;
DROP FUNCTION shift_history_guard();
ALTER TABLE terminals DROP CONSTRAINT terminal_business_unique;
