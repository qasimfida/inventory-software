-- Up Migration
ALTER TABLE sales ADD COLUMN receipt_footer text NOT NULL DEFAULT '' CHECK (length(receipt_footer) <= 500);

-- Down Migration
ALTER TABLE sales DROP COLUMN receipt_footer;
