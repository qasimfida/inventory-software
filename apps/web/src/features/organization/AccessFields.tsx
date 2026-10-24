import { useState } from 'react';
import {
  permissionGroups,
  permissionLabel,
  roleGuidance,
  roleCapabilities,
} from '@inventory/api-client';
import { assignableRoleSchema } from '@inventory/contracts';
import { AccordionSection } from '@/components/ui/Accordion';
import type { Membership, Workspace } from '@inventory/contracts';
import { Checkbox, Select } from '@/components/ui/FormControls';
export function AccessFields({
  role,
  member,
  workspace,
}: {
  role: string;
  member: Membership | null;
  workspace: Workspace;
}) {
  const [selected, setSelected] = useState(member?.permissions ?? []);
  const parsedRole = assignableRoleSchema.safeParse(role);
  const [storeId, setStoreId] = useState(member?.scope?.storeId ?? '');
  return (
    <>
      <p className="text-sm text-muted-foreground">{roleGuidance[role]}</p>
      {parsedRole.success && role !== 'custom' && (
        <AccordionSection title="View included permissions">
          <ul>
            {roleCapabilities(parsedRole.data).map((label) => (
              <li key={label}>{label}</li>
            ))}
          </ul>
        </AccordionSection>
      )}
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
          {permissionGroups(!!storeId).map((group) => (
            <AccordionSection
              key={group.key}
              title={`${group.label} · ${group.permissions.filter((p) => selected.includes(p)).length} selected`}
            >
              {group.permissions.map((permission) => (
                <label key={permission} className="flex min-h-(--target-size) items-center gap-2">
                  <Checkbox
                    name="permission"
                    value={permission}
                    checked={selected.includes(permission)}
                    onCheckedChange={(checked) =>
                      setSelected((old) =>
                        checked === true
                          ? [...old, permission]
                          : old.filter((p) => p !== permission),
                      )
                    }
                  />
                  {permissionLabel(permission)}
                </label>
              ))}
            </AccordionSection>
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
