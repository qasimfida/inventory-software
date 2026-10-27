-- Up Migration
ALTER TABLE businesses ADD COLUMN setup_dismissed boolean NOT NULL DEFAULT false;

-- Down Migration
ALTER TABLE businesses DROP COLUMN setup_dismissed;
