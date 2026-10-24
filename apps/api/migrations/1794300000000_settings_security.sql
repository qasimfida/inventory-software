-- Up Migration
CREATE TABLE user_preferences (
  account_id uuid PRIMARY KEY REFERENCES auth_accounts(id), data jsonb NOT NULL DEFAULT '{}',
  version integer NOT NULL DEFAULT 1 CHECK(version>0), updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK(jsonb_typeof(data)='object')
);
CREATE TABLE settings_policies (
  scope_id uuid PRIMARY KEY, business_id uuid UNIQUE REFERENCES businesses(id),
  data jsonb NOT NULL DEFAULT '{}', version integer NOT NULL DEFAULT 1 CHECK(version>0),
  updated_at timestamptz NOT NULL DEFAULT now(), CHECK(jsonb_typeof(data)='object'),
  CHECK((business_id IS NULL AND scope_id='00000000-0000-0000-0000-000000000000') OR (business_id IS NOT NULL AND scope_id=business_id))
);
CREATE TABLE recognized_devices (
  id uuid PRIMARY KEY, account_id uuid NOT NULL REFERENCES auth_accounts(id), signal_hash text NOT NULL CHECK(length(signal_hash)=64),
  kind text NOT NULL CHECK(kind IN ('browser','native')), first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(), UNIQUE(account_id,signal_hash)
);
ALTER TABLE auth_sessions ADD COLUMN device_id uuid REFERENCES recognized_devices(id);
CREATE TABLE security_events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, occurred_at timestamptz NOT NULL DEFAULT now(),
  actor_id uuid REFERENCES auth_accounts(id), business_id uuid REFERENCES businesses(id), device_id uuid REFERENCES recognized_devices(id),
  event text NOT NULL CHECK(length(event)<=80), outcome text NOT NULL CHECK(outcome IN ('success','denied','failure')),
  request_id uuid NOT NULL, policy_change jsonb CHECK(policy_change IS NULL OR jsonb_typeof(policy_change)='object'), subject_hash text CHECK(subject_hash IS NULL OR length(subject_hash)=64)
);
CREATE INDEX security_events_actor ON security_events(actor_id,id DESC);
CREATE INDEX security_events_business ON security_events(business_id,id DESC);
CREATE TRIGGER security_events_no_change BEFORE UPDATE OR DELETE ON security_events FOR EACH ROW EXECUTE FUNCTION organization_audit_immutable();
CREATE TRIGGER security_events_no_truncate BEFORE TRUNCATE ON security_events FOR EACH STATEMENT EXECUTE FUNCTION organization_audit_immutable();
CREATE TRIGGER organization_audit_no_truncate BEFORE TRUNCATE ON organization_audit FOR EACH STATEMENT EXECUTE FUNCTION organization_audit_immutable();
CREATE TRIGGER platform_audit_no_truncate BEFORE TRUNCATE ON platform_audit FOR EACH STATEMENT EXECUTE FUNCTION organization_audit_immutable();
CREATE TABLE security_deliveries (
  id uuid PRIMARY KEY, position bigint GENERATED ALWAYS AS IDENTITY UNIQUE, event_id bigint NOT NULL REFERENCES security_events(id), recipient_id uuid NOT NULL REFERENCES auth_accounts(id),
  audience text NOT NULL CHECK(audience IN ('self','business-admin','platform-admin')), business_id uuid REFERENCES businesses(id),
  state text NOT NULL DEFAULT 'pending' CHECK(state IN ('pending','delivered','failed')),
  attempts integer NOT NULL DEFAULT 0 CHECK(attempts BETWEEN 0 AND 8), next_attempt_at timestamptz NOT NULL DEFAULT now(),
  delivered_at timestamptz, failure_code text,
  CHECK((audience='business-admin')=(business_id IS NOT NULL)),
  UNIQUE NULLS NOT DISTINCT(event_id,recipient_id,audience,business_id)
);
CREATE INDEX security_delivery_pending ON security_deliveries(next_attempt_at) WHERE state='pending';
CREATE INDEX security_delivery_recipient ON security_deliveries(recipient_id,position DESC);
CREATE TABLE security_inbox (
  delivery_id uuid PRIMARY KEY REFERENCES security_deliveries(id), available_at timestamptz NOT NULL DEFAULT now(), read_at timestamptz
);
CREATE TABLE diagnostic_events (
  id uuid PRIMARY KEY, occurred_at timestamptz NOT NULL DEFAULT now(), request_id uuid NOT NULL,
  environment text NOT NULL, application_version text NOT NULL, code text NOT NULL, category text NOT NULL,
  operation text NOT NULL, severity text NOT NULL, retryable boolean NOT NULL,
  actor_id uuid REFERENCES auth_accounts(id), reason text NOT NULL, recovery text NOT NULL
);
CREATE INDEX diagnostic_events_retention ON diagnostic_events(occurred_at);
-- Down Migration
DROP TRIGGER platform_audit_no_truncate ON platform_audit;
DROP TRIGGER organization_audit_no_truncate ON organization_audit;
DROP TABLE diagnostic_events;
DROP TABLE security_inbox;
DROP TABLE security_deliveries;
DROP TABLE security_events;
ALTER TABLE auth_sessions DROP COLUMN device_id;
DROP TABLE recognized_devices;
DROP TABLE settings_policies;
DROP TABLE user_preferences;
