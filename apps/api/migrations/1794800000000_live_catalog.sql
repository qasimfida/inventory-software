-- Up Migration
CREATE TABLE live_catalog_tickets (
 token_hash text PRIMARY KEY,
 session_id uuid NOT NULL REFERENCES auth_sessions(id) ON DELETE CASCADE,
 business_id uuid NOT NULL REFERENCES businesses(id),
 expires_at timestamptz NOT NULL
);
CREATE INDEX live_catalog_ticket_expiry ON live_catalog_tickets(expires_at);
CREATE FUNCTION notify_catalog_change() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 PERFORM pg_notify('inventory_catalog', NEW.business_id::text);
 RETURN NEW;
END; $$;
CREATE TRIGGER live_catalog_change AFTER INSERT ON sync_changes
FOR EACH ROW EXECUTE FUNCTION notify_catalog_change();
-- Down Migration
DROP TRIGGER live_catalog_change ON sync_changes;
DROP FUNCTION notify_catalog_change();
DROP TABLE live_catalog_tickets;
