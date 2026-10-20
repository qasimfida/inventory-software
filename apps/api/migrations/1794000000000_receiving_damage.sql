-- Up Migration
ALTER TABLE purchase_receipts ADD COLUMN damaged numeric(24,6) NOT NULL DEFAULT 0 CHECK(damaged>=0 AND damaged<=quantity);
ALTER TABLE purchase_receipts ADD COLUMN damage_reason text NOT NULL DEFAULT '';
-- Down Migration
ALTER TABLE purchase_receipts DROP COLUMN damage_reason;
ALTER TABLE purchase_receipts DROP COLUMN damaged;
