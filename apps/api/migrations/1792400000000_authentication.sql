-- Up Migration
CREATE TABLE auth_accounts (
  id uuid PRIMARY KEY,
  email text NOT NULL UNIQUE CHECK (email = lower(email)),
  password_hash text NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'disabled')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE auth_invitations (
  token_hash text PRIMARY KEY,
  email text NOT NULL UNIQUE CHECK (email = lower(email)),
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE auth_sessions (
  id uuid PRIMARY KEY,
  account_id uuid NOT NULL REFERENCES auth_accounts(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  transport text NOT NULL CHECK (transport IN ('cookie', 'bearer')),
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  absolute_expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  CHECK (expires_at <= absolute_expires_at)
);
CREATE INDEX auth_sessions_account ON auth_sessions(account_id);
CREATE TABLE auth_rate_limits (
  key_hash text PRIMARY KEY,
  attempts integer NOT NULL,
  resets_at timestamptz NOT NULL
);
CREATE INDEX auth_rate_limits_expiry ON auth_rate_limits(resets_at);
-- Down Migration
DROP TABLE auth_rate_limits;
DROP TABLE auth_sessions;
DROP TABLE auth_invitations;
DROP TABLE auth_accounts;
