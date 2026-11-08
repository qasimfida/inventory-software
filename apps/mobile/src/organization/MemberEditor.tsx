import { RecordDetails } from '../ui/RecordDetails';
import { memberDetails } from '@inventory/api-client';
import { ConfirmAction } from '../ui/ConfirmAction';
import { SidePanel } from '../ui/SidePanel';
import { MemberCollection } from './MemberCollection';
import { Text } from '../ui/Themed';
import { hasPermission } from '@inventory/contracts';
import { AccessFields } from './AccessFields';
import type { AssignmentAccess } from './AccessFields';
import { useState } from 'react';
import { View } from 'react-native';
import { assignMemberSchema, editMemberSchema } from '@inventory/contracts';
import type { Membership, Workspace } from '@inventory/contracts';
import type { OrganizationModel } from '@inventory/api-client';
import { Action, Choice, choices, Field, styles } from './Controls';
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
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('viewer');
  const [state, setState] = useState('active');
  const [access, setAccess] = useState<AssignmentAccess>({
    scope: { storeId: null, warehouseId: null },
    permissions: [],
  });
  function edit(member: Membership | null) {
    setOpen(true);
    setEditing(member);
    setAccess({
      scope: member?.scope ?? { storeId: null, warehouseId: null },
      permissions: member?.permissions ?? [],
    });
    setRole(member?.role ?? 'viewer');
    setState(member?.state ?? 'active');
  }
  const writable = hasPermission(workspace.business, 'users.write');
  return (
    <View style={styles.group}>
      <MemberCollection
        workspace={workspace}
        busy={busy}
        onAssign={() => edit(null)}
        onEdit={edit}
      />
      {editing && (!writable || editing.state === 'archived') ? (
        <SidePanel title="Member details" open={open} onClose={() => setOpen(false)}>
          <RecordDetails
            label="Membership details"
            items={memberDetails(editing, workspace.locations)}
          />
        </SidePanel>
      ) : (
        writable && (
          <SidePanel
            title={editing ? `Edit ${editing.email}` : 'Add member'}
            open={open}
            onClose={() => setOpen(false)}
          >
            <Text>
              Choose the account role and location access. Keep at least one active owner.
            </Text>
            {!editing && (
              <Field label="Member email" value={email} onChange={setEmail} disabled={busy} />
            )}
            <Choice
              label="Role"
              value={role}
              options={choices(['owner', 'manager', 'cashier', 'viewer', 'custom'])}
              onChange={(value) => {
                setRole(value);
                setAccess({ scope: { storeId: null, warehouseId: null }, permissions: [] });
              }}
              disabled={busy}
            />
            <AccessFields
              role={role}
              value={access}
              onChange={setAccess}
              workspace={workspace}
              busy={busy}
            />
            {editing && (
              <Choice
                label="Membership state"
                value={state}
                options={choices(['active', 'suspended', 'archived'])}
                onChange={setState}
                disabled={busy}
              />
            )}
            <Action
              label={editing ? 'Save membership' : 'Add member'}
              disabled={busy}
              onPress={() =>
                void model.refresh(async () => {
                  if (editing)
                    await model.client.editMember(
                      workspace.business.id,
                      editing.accountId,
                      editMemberSchema.parse({ role, state, version: editing.version, ...access }),
                    );
                  else
                    await model.client.assign(
                      workspace.business.id,
                      assignMemberSchema.parse({ email, role, ...access }),
                    );
                  setOpen(false);
                  setEmail('');
                })
              }
            />
            {editing && (
              <Action
                label="Cancel membership edit"
                disabled={busy}
                onPress={() => setOpen(false)}
              />
            )}
            {editing && (
              <ConfirmAction
                label="Remove member access"
                disabled={busy}
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
          </SidePanel>
        )
      )}
    </View>
  );
}
