-- Up Migration
CREATE TABLE trading_relationships(
 id uuid PRIMARY KEY,proposer_id uuid NOT NULL REFERENCES businesses(id),partner_id uuid NOT NULL REFERENCES businesses(id),
 state text NOT NULL DEFAULT 'pending' CHECK(state IN ('pending','active','revoked')),version integer NOT NULL DEFAULT 1,
 created_at timestamptz NOT NULL DEFAULT now(), CHECK(proposer_id<>partner_id)
);
CREATE UNIQUE INDEX trading_pair ON trading_relationships(least(proposer_id,partner_id),greatest(proposer_id,partner_id));
CREATE INDEX trading_partner ON trading_relationships(partner_id,created_at,id);
CREATE INDEX trading_proposer ON trading_relationships(proposer_id,created_at,id);
CREATE TABLE trading_orders(
 id uuid PRIMARY KEY,relationship_id uuid NOT NULL REFERENCES trading_relationships(id),
 buyer_id uuid NOT NULL REFERENCES businesses(id),seller_id uuid NOT NULL REFERENCES businesses(id),
 reference text NOT NULL,currency text NOT NULL CHECK(currency ~ '^[A-Z]{3}$'),lines jsonb NOT NULL CHECK(jsonb_typeof(lines)='array' AND jsonb_array_length(lines) BETWEEN 1 AND 50),
 state text NOT NULL DEFAULT 'submitted' CHECK(state IN ('submitted','accepted','dispatched','received','cancelled')),
 version integer NOT NULL DEFAULT 1,created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(buyer_id,reference),CHECK(buyer_id<>seller_id)
);
CREATE INDEX trading_buyer ON trading_orders(buyer_id,created_at,id);
CREATE INDEX trading_seller ON trading_orders(seller_id,created_at,id);
CREATE FUNCTION trading_order_boundary() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM trading_relationships r WHERE r.id=NEW.relationship_id AND
 ((r.proposer_id=NEW.buyer_id AND r.partner_id=NEW.seller_id) OR (r.partner_id=NEW.buyer_id AND r.proposer_id=NEW.seller_id))) THEN
 RAISE EXCEPTION 'Invalid trading parties' USING ERRCODE='23514'; END IF;
 IF TG_OP='UPDATE' AND (NEW.relationship_id,NEW.buyer_id,NEW.seller_id,NEW.reference,NEW.currency,NEW.lines,NEW.created_at) IS DISTINCT FROM
 (OLD.relationship_id,OLD.buyer_id,OLD.seller_id,OLD.reference,OLD.currency,OLD.lines,OLD.created_at) THEN
 RAISE EXCEPTION 'Trading terms are immutable' USING ERRCODE='23514'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER trading_order_boundary BEFORE INSERT OR UPDATE ON trading_orders FOR EACH ROW EXECUTE FUNCTION trading_order_boundary();
CREATE TABLE trading_events(
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,order_id uuid NOT NULL REFERENCES trading_orders(id),
 business_id uuid NOT NULL REFERENCES businesses(id),state text NOT NULL,note text NOT NULL,created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER trading_event_immutable BEFORE UPDATE OR DELETE ON trading_events FOR EACH ROW EXECUTE FUNCTION organization_audit_immutable();
CREATE INDEX trading_event_order ON trading_events(order_id,id);
CREATE TABLE accounting_periods(
 id uuid PRIMARY KEY,business_id uuid NOT NULL REFERENCES businesses(id),starts_on date NOT NULL,ends_on date NOT NULL,
 state text NOT NULL DEFAULT 'open' CHECK(state IN ('open','closed')),UNIQUE(business_id,id),CHECK(ends_on>=starts_on AND ends_on-starts_on<=366)
);
CREATE INDEX accounting_period_business ON accounting_periods(business_id,starts_on);
CREATE FUNCTION accounting_period_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 PERFORM 1 FROM businesses WHERE id=NEW.business_id FOR UPDATE;
 IF TG_OP='UPDATE' AND ((NEW.id,NEW.business_id,NEW.starts_on,NEW.ends_on) IS DISTINCT FROM (OLD.id,OLD.business_id,OLD.starts_on,OLD.ends_on) OR OLD.state='closed') THEN
 RAISE EXCEPTION 'Closed or immutable period' USING ERRCODE='23514'; END IF;
 IF EXISTS(SELECT 1 FROM accounting_periods WHERE business_id=NEW.business_id AND id<>NEW.id AND starts_on<=NEW.ends_on AND ends_on>=NEW.starts_on) THEN
 RAISE EXCEPTION 'Overlapping accounting periods' USING ERRCODE='23514'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER accounting_period_guard BEFORE INSERT OR UPDATE ON accounting_periods FOR EACH ROW EXECUTE FUNCTION accounting_period_guard();
CREATE TABLE accounting_journals(
 id uuid PRIMARY KEY,business_id uuid NOT NULL REFERENCES businesses(id),period_id uuid NOT NULL,
 posted_on date NOT NULL,currency text NOT NULL CHECK(currency ~ '^[A-Z]{3}$'),reason text NOT NULL,
 source_kind text NOT NULL CHECK(source_kind IN ('manual','reversal','sale','sale_return','cash_payment','cash_refund','supplier_invoice','supplier_credit','supplier_settlement')),
 source_id uuid,reversal_id uuid,actor_id uuid NOT NULL REFERENCES auth_accounts(id),created_at timestamptz NOT NULL DEFAULT now(),
 created_xid text NOT NULL DEFAULT pg_current_xact_id()::text,
 UNIQUE(business_id,id),UNIQUE(business_id,source_kind,source_id),UNIQUE(business_id,reversal_id),
 FOREIGN KEY(business_id,period_id) REFERENCES accounting_periods(business_id,id),
 FOREIGN KEY(business_id,reversal_id) REFERENCES accounting_journals(business_id,id),
 CHECK((source_kind IN ('manual','reversal'))=(source_id IS NULL)),CHECK((source_kind='reversal')=(reversal_id IS NOT NULL))
);
CREATE INDEX accounting_journal_date ON accounting_journals(business_id,posted_on,id);
CREATE TABLE accounting_lines(
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,business_id uuid NOT NULL,journal_id uuid NOT NULL,
 account text NOT NULL CHECK(account IN ('1000','1100','2000','2100','3000','4000','4100','5000')),
 debit numeric(24,0) NOT NULL CHECK(debit>=0),credit numeric(24,0) NOT NULL CHECK(credit>=0),
 CHECK((debit>0 AND credit=0) OR (credit>0 AND debit=0)),
 FOREIGN KEY(business_id,journal_id) REFERENCES accounting_journals(business_id,id)
);
CREATE INDEX accounting_line_journal ON accounting_lines(business_id,journal_id,id);
CREATE FUNCTION accounting_post_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM accounting_periods WHERE business_id=NEW.business_id AND id=NEW.period_id AND state='open' AND NEW.posted_on BETWEEN starts_on AND ends_on FOR SHARE) THEN
 RAISE EXCEPTION 'No open accounting period' USING ERRCODE='23514'; END IF;
 NEW.created_xid:=pg_current_xact_id()::text;
 RETURN NEW;
END $$;
CREATE TRIGGER accounting_post_guard BEFORE INSERT ON accounting_journals FOR EACH ROW EXECUTE FUNCTION accounting_post_guard();
CREATE FUNCTION accounting_line_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM accounting_journals WHERE business_id=NEW.business_id AND id=NEW.journal_id AND created_xid=pg_current_xact_id()::text) THEN
 RAISE EXCEPTION 'Posted journals are immutable' USING ERRCODE='23514'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER accounting_line_guard BEFORE INSERT ON accounting_lines FOR EACH ROW EXECUTE FUNCTION accounting_line_guard();
CREATE FUNCTION accounting_balanced() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE n integer; d numeric; c numeric; target_id uuid;
BEGIN
 IF TG_TABLE_NAME='accounting_journals' THEN target_id:=NEW.id; ELSE target_id:=NEW.journal_id; END IF;
 SELECT count(*),sum(debit),sum(credit) INTO n,d,c FROM accounting_lines WHERE business_id=NEW.business_id AND journal_id=target_id;
 IF n<2 OR n>50 OR d<>c THEN RAISE EXCEPTION 'Journal must have balanced lines' USING ERRCODE='23514'; END IF;
 RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER accounting_balanced AFTER INSERT ON accounting_journals DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION accounting_balanced();
CREATE CONSTRAINT TRIGGER accounting_lines_balanced AFTER INSERT ON accounting_lines DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION accounting_balanced();
CREATE TRIGGER accounting_journal_immutable BEFORE UPDATE OR DELETE ON accounting_journals FOR EACH ROW EXECUTE FUNCTION organization_audit_immutable();
CREATE TRIGGER accounting_line_immutable BEFORE UPDATE OR DELETE ON accounting_lines FOR EACH ROW EXECUTE FUNCTION organization_audit_immutable();
-- Down Migration
DROP TABLE accounting_lines,accounting_journals,accounting_periods;
DROP FUNCTION accounting_balanced(),accounting_line_guard(),accounting_post_guard(),accounting_period_guard();
DROP TABLE trading_events,trading_orders,trading_relationships;
DROP FUNCTION trading_order_boundary();
