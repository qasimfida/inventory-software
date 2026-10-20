import { businessTime } from '@inventory/contracts';
import type { OrganizationView } from '@inventory/api-client';
export function AuditHistory({
  events,
  timeZone,
}: {
  events: OrganizationView['events'];
  timeZone: string;
}) {
  return (
    <section aria-label="Audit history">
      <h3>Audit history</h3>
      <ul className="space-y-3">
        {events.map((event) => (
          <li key={event.id} className="rounded border p-3">
            <p>
              {businessTime(event.occurredAt, timeZone)} · {event.action}
            </p>
            <p>
              Actor: {event.actorId} · Target: {event.resourceId}
            </p>
            <p>
              Store: {event.storeId ?? 'Business scope'} · Warehouse: {event.warehouseId ?? 'None'}
            </p>
            <details>
              <summary>Safe change details</summary>
              <pre className="overflow-auto text-xs">
                {JSON.stringify({ before: event.before, after: event.after }, null, 2)}
              </pre>
            </details>
          </li>
        ))}
      </ul>
    </section>
  );
}
