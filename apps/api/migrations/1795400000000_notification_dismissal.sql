-- Up Migration
ALTER TABLE business_deliveries ADD COLUMN dismissed_at timestamptz;

-- Down Migration
ALTER TABLE business_deliveries DROP COLUMN dismissed_at;
