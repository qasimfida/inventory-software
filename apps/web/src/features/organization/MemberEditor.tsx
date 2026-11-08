import { RecordDetails } from '@/components/common/RecordDetails';
import { memberDetails } from '@inventory/api-client';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { FormSheet } from '@/components/common/FormSheet';
import { MemberCollection } from './MemberCollection';
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
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Membership | null>(null);
  const [role, setRole] = useState('viewer');
  function edit(member: Membership | null) {
    setOpen(true);
    setEditing(member);
    setRole(member?.role ?? 'viewer');
  }
  const writable = hasPermission(workspace.business, 'users.write');
  return (
    <section aria-label="Business membership" className="screen-section">
      <MemberCollection
        workspace={workspace}
        busy={busy}
        onAssign={() => edit(null)}
        onEdit={edit}
      />
      {editing && (!writable || editing.state === 'archived') ? (
        <FormSheet
          title="Member details"
          description="Account role and assigned access scope."
          open={open}
          onOpenChange={setOpen}
        >
          <RecordDetails
            label="Membership details"
            items={memberDetails(editing, workspace.locations)}
          />
        </FormSheet>
      ) : (
        writable && (
          <FormSheet
            title={editing ? `Edit ${editing.email}` : 'Add member'}
            description="Choose the account role, access scope and membership status."
            open={open}
            onOpenChange={setOpen}
          >
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
                  setOpen(false);
                  form.reset();
                });
              }}
            >
              <fieldset disabled={busy} className="screen-form">
                <legend className="sr-only">
                  {editing ? `Edit ${editing.email}` : 'Assign account'}
                </legend>
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
                    <p className="text-sm">
                      Keep at least one active owner. Archiving is permanent.
                    </p>
                  </>
                )}
                <div className="drawer-actions">
                  {' '}
                  <Button type="submit">{editing ? 'Save membership' : 'Add member'}</Button>
                  {editing && (
                    <Button variant="outline" onClick={() => setOpen(false)}>
                      Cancel membership edit
                    </Button>
                  )}
                </div>
                {editing && (
                  <ConfirmDialog
                    title="Remove member access?"
                    trigger={
                      <Button variant="destructive" disabled={busy}>
                        Remove member access
                      </Button>
                    }
                    description="Permanently remove this membership. Other businesses and audit history remain intact. The last active owner cannot be removed."
                    confirmLabel="Remove access"
                    onConfirm={() => {
                      if (!editing || busy) return;
                      void model.refresh(async () => {
                        await model.client.editMember(
                          workspace.business.id,
                          editing.accountId,
                          editMemberSchema.parse({
                            role: editing.role,
                            state: 'archived',
                            version: editing.version,
                            scope: editing.scope,
                            permissions: editing.permissions,
                          }),
                        );
                        setOpen(false);
                      });
                    }}
                  />
                )}
              </fieldset>
            </form>
          </FormSheet>
        )
      )}
    </section>
  );
}
