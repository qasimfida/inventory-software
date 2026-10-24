-- Up Migration
-- Historical audit references deliberately have no FK: normal expired-session pruning must remain possible.
ALTER TABLE security_events ADD COLUMN session_id uuid;
-- Down Migration
ALTER TABLE security_events DROP COLUMN session_id;
