import { useState } from 'react';
import { permissionSchema } from '@inventory/contracts';
import type { Membership, Workspace } from '@inventory/contracts';
import { Select } from '@/components/ui/FormControls';
export function AccessFields({
  role,
  member,
  workspace,
}: {
  role: string;
  member: Membership | null;
  workspace: Workspace;
}) {
  const [storeId, setStoreId] = useState(member?.scope?.storeId ?? '');
  return (
    <>
      {role !== 'owner' && (
        <>
          <label htmlFor="access-store">Access scope: store</label>
          <Select
            id="access-store"
            name="scopeStoreId"
            value={storeId}
            onChange={(e) => setStoreId(e.target.value)}
          >
            <option value="">Entire business</option>
            {workspace.locations
              .filter((l) => l.kind === 'stores' && l.state === 'active')
              .map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
          </Select>
          {storeId && (
            <>
              <label htmlFor="access-warehouse">Access scope: warehouse</label>
              <Select
                id="access-warehouse"
                name="scopeWarehouseId"
                key={storeId}
                defaultValue={member?.scope?.warehouseId ?? ''}
              >
                <option value="">Entire store</option>
                {workspace.locations
                  .filter(
                    (l) => l.kind === 'warehouses' && l.storeId === storeId && l.state === 'active',
                  )
                  .map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name}
                    </option>
                  ))}
              </Select>
            </>
          )}
        </>
      )}
      {role === 'custom' && (
        <fieldset>
          <legend>Custom permissions</legend>
          {permissionSchema.options
            .filter(
              (p) =>
                p !== 'users.write' && (!storeId || !['users.read', 'business.write'].includes(p)),
            )
            .map((p) => (
              <label key={p} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  name="permission"
                  value={p}
                  defaultChecked={member?.permissions?.includes(p)}
                />
                {p}
              </label>
            ))}
        </fieldset>
      )}
      <p className="text-sm">
        Owners have business-wide access. Store scopes include their warehouses; warehouse scopes
        include only that warehouse and its terminals. Custom permissions never grant role
        delegation.
      </p>
    </>
  );
}
