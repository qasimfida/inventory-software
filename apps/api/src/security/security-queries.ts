// These predicates are reapplied on every read/acknowledgement, never trusted from the UI.
export const recipientAccess = `d.recipient_id=$1 AND EXISTS(SELECT 1 FROM auth_accounts a WHERE a.id=$1 AND a.status='active') AND (
 (d.audience='self' AND e.actor_id=$1) OR
 (d.audience='platform-admin' AND EXISTS(SELECT 1 FROM platform_administrators p WHERE p.account_id=$1)) OR
 (d.audience='business-admin' AND EXISTS(SELECT 1 FROM business_memberships m JOIN businesses b ON b.id=m.business_id
  WHERE m.business_id=d.business_id AND m.account_id=$1 AND m.role='owner' AND m.state='active' AND b.state='active')
  AND EXISTS(SELECT 1 FROM business_memberships m WHERE m.business_id=d.business_id AND m.account_id=e.actor_id AND m.state='active')))`;
export const eventProjection = `e.id::text,e.occurred_at AS "occurredAt",e.actor_id AS "actorId",
 e.business_id AS "businessId",e.device_id AS "deviceId",e.event,e.outcome,e.session_id AS "sessionId",e.policy_change AS "policyChange",e.request_id AS "requestId"`;
export const notificationProjection = `d.id,e.id::text AS "eventId",e.occurred_at AS "occurredAt",
 e.actor_id AS "actorId",e.device_id AS "deviceId",d.business_id AS "businessId",d.audience,i.read_at AS "readAt"`;
