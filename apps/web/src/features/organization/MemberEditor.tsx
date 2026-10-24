import { ScreenHeader } from '@/components/common/ScreenHeader';
import { hasPermission } from '@inventory/contracts';
import { AccessFields } from './AccessFields';
import { useState } from 'react';
import { assignMemberSchema, editMemberSchema } from '@inventory/contracts';
import type { Membership, Workspace } from '@inventory/contracts';
import type { OrganizationModel } from '@inventory/api-client';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/FormControls';
export function MemberEditor({
  model,
  workspace,
  busy,
}: {
  model: OrganizationModel;
  workspace: Workspace;
  busy: boolean;
}) {
  const [editing, setEditing] = useState<Membership | null>(null);
  const [role, setRole] = useState('viewer');
  function edit(member: Membership | null) {
    setEditing(member);
    setRole(member?.role ?? 'viewer');
  }
  const writable = hasPermission(workspace.business, 'users.write');
  return (
    <section aria-label="Business membership" className="screen-section">
      <ScreenHeader
        title="Membership"
        level={3}
        description={
          <>
            Assign an existing invited account. Owners control memberships; managers control
            locations; viewers can read locations.
          </>
        }
      />
      <ul className="record-list">
        {workspace.members.map((member) => (
          <li key={member.accountId}>
            {member.email} · {member.role} · {member.state}{' '}
            {writable && member.state !== 'archived' && (
              <Button disabled={busy} variant="outline" onClick={() => edit(member)}>
                Edit membership {member.email}
              </Button>
            )}
          </li>
        ))}
      </ul>
      {writable && (
        <form
          key={editing?.accountId ?? 'new'}
          className="screen-form"
          onSubmit={(event) => {
            event.preventDefault();
            const form = event.currentTarget;
            const data = new FormData(form);
            const access = {
              scope: {
                storeId: data.get('scopeStoreId') || null,
                warehouseId: data.get('scopeWarehouseId') || null,
              },
              permissions: data.getAll('permission'),
            };
            void model.refresh(async () => {
              if (editing)
                await model.client.editMember(
                  workspace.business.id,
                  editing.accountId,
                  editMemberSchema.parse({
                    role: data.get('role'),
                    ...access,
                    state: data.get('state'),
                    version: editing.version,
                  }),
                );
              else
                await model.client.assign(
                  workspace.business.id,
                  assignMemberSchema.parse({
                    email: data.get('email'),
                    role: data.get('role'),
                    ...access,
                  }),
                );
              edit(null);
              form.reset();
            });
          }}
        >
          <fieldset disabled={busy} className="screen-form">
            <legend>{editing ? `Edit ${editing.email}` : 'Assign account'}</legend>
            {!editing && (
              <>
                <label htmlFor="member-email">Member email</label>
                <Input id="member-email" name="email" type="email" required maxLength={254} />
              </>
            )}
            <label htmlFor="member-role">Role</label>
            <Select
              id="member-role"
              name="role"
              value={role}
              onChange={(e) => setRole(e.target.value)}
            >
              {['owner', 'manager', 'cashier', 'viewer', 'custom'].map((role) => (
                <option key={role}>{role}</option>
              ))}
            </Select>
            <AccessFields
              key={editing?.accountId ?? 'new'}
              role={role}
              member={editing}
              workspace={workspace}
            />
            {editing && (
              <>
                <label htmlFor="member-state">Membership state</label>
                <Select id="member-state" name="state" defaultValue={editing.state}>
                  {['active', 'suspended', 'archived'].map((state) => (
                    <option key={state}>{state}</option>
                  ))}
                </Select>
                <p className="text-sm">Keep at least one active owner. Archiving is permanent.</p>
              </>
            )}
            <Button type="submit">{editing ? 'Save membership' : 'Assign member'}</Button>
            {editing && (
              <Button variant="outline" onClick={() => edit(null)}>
                Cancel membership edit
              </Button>
            )}
          </fieldset>
        </form>
      )}
    </section>
  );
}
