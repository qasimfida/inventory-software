-- Up Migration
-- Public provider metadata only. One row coordinates refreshes across API replicas.
CREATE TABLE exchange_rate_cache (
  id text PRIMARY KEY CHECK (id = 'open-exchange-rates'),
  snapshot jsonb,
  next_attempt_at timestamptz NOT NULL DEFAULT '-infinity'
);
INSERT INTO exchange_rate_cache(id) VALUES('open-exchange-rates');

-- Down Migration
DROP TABLE exchange_rate_cache;
