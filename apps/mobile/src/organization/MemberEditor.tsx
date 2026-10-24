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
  const [editing, setEditing] = useState<Membership | null>(null);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('viewer');
  const [state, setState] = useState('active');
  const [access, setAccess] = useState<AssignmentAccess>({
    scope: { storeId: null, warehouseId: null },
    permissions: [],
  });
  function edit(member: Membership | null) {
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
      <Text accessibilityRole="header" style={styles.heading}>
        Membership
      </Text>
      <Text>
        Assign an existing invited account. Keep at least one active owner. Archived membership
        cannot be restored.
      </Text>
      {workspace.members.map((member) => (
        <View key={member.accountId}>
          <Text>
            {member.email} · {member.role} · {member.state}
          </Text>
          {writable && member.state !== 'archived' && (
            <Action
              label={`Edit membership ${member.email}`}
              disabled={busy}
              onPress={() => edit(member)}
            />
          )}
        </View>
      ))}
      {writable && (
        <>
          <Text>{editing ? `Edit ${editing.email}` : 'Assign account'}</Text>
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
            label={editing ? 'Save membership' : 'Assign member'}
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
                edit(null);
                setEmail('');
              })
            }
          />
          {editing && (
            <Action label="Cancel membership edit" disabled={busy} onPress={() => edit(null)} />
          )}
        </>
      )}
    </View>
  );
}
