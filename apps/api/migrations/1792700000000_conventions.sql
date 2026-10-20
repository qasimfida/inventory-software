-- Up Migration
ALTER TABLE businesses ADD COLUMN time_zone text NOT NULL DEFAULT 'UTC' CHECK(length(time_zone) BETWEEN 1 AND 100);
CREATE TABLE operation_receipts (
  business_id uuid NOT NULL REFERENCES businesses(id), actor_id uuid NOT NULL REFERENCES auth_accounts(id),
  operation text NOT NULL, idempotency_key uuid NOT NULL, request_hash text NOT NULL,
  access_hash text NOT NULL, response jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(business_id,actor_id,operation,idempotency_key)
);
CREATE INDEX operation_receipts_created ON operation_receipts(created_at);
-- Down Migration
DROP TABLE operation_receipts;
ALTER TABLE businesses DROP COLUMN time_zone;
