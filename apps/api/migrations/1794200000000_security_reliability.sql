-- Up Migration
CREATE TABLE auth_password_resets (
 token_hash text PRIMARY KEY CHECK(token_hash ~ '^[a-f0-9]{64}$'),
 account_id uuid NOT NULL REFERENCES auth_accounts(id),
 created_at timestamptz NOT NULL DEFAULT now(),
 expires_at timestamptz NOT NULL,
 consumed_at timestamptz,
 CHECK(expires_at>created_at)
);
CREATE INDEX auth_password_reset_account ON auth_password_resets(account_id);
CREATE INDEX auth_password_reset_expiry ON auth_password_resets(expires_at);
ALTER TABLE offline_leases ADD COLUMN revoked_at timestamptz;
-- Old cursors have no currency evidence; force a safe full refresh.
DELETE FROM sync_cursors;
ALTER TABLE sync_cursors ADD COLUMN currency text NOT NULL CHECK(currency ~ '^[A-Z]{3}$');
-- Down Migration
ALTER TABLE sync_cursors DROP COLUMN currency;
ALTER TABLE offline_leases DROP COLUMN revoked_at;
DROP TABLE auth_password_resets;
