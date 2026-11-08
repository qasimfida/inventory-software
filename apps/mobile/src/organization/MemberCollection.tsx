import { ScreenHeader } from '../ui/ScreenHeader';
import { ExportRecords } from '../ui/ExportRecords';
import { memberScopeLabel } from '@inventory/api-client';
import { useState } from 'react';
import { hasPermission } from '@inventory/contracts';
import type { Membership, Workspace } from '@inventory/contracts';
import { View } from 'react-native';
import { RecordCollection } from '../ui/RecordCollection';
import { SearchControl } from '../ui/SearchControl';
import { FilterButton } from '../ui/FilterButton';
import { SidePanel } from '../ui/SidePanel';
import { Action, Choice } from '../ui/Controls';
export function MemberCollection({
  workspace,
  busy,
  onAssign,
  onEdit,
}: {
  workspace: Workspace;
  busy: boolean;
  onAssign: () => void;
  onEdit: (member: Membership) => void;
}) {
  const [search, setSearch] = useState(''),
    [role, setRole] = useState(''),
    [status, setStatus] = useState('');
  const [open, setOpen] = useState(false);
  const writable = hasPermission(workspace.business, 'users.write');
  const members = workspace.members.filter(
    (m) =>
      `${m.email} ${m.role}`.toLowerCase().includes(search.toLowerCase()) &&
      (!role || m.role === role) &&
      (!status || m.state === status),
  );
  const active = [role && `Role: ${role}`, status && `Status: ${status}`].filter(Boolean);
  return (
    <>
      <ScreenHeader
        title="Membership"
        description="Add an existing invited account and manage its role and location access."
        actions={
          <>
            <ExportRecords
              name="members"
              headers={['Member', 'Role', 'Access scope', 'Status']}
              rows={members.map((m) => [
                m.email,
                m.role,
                memberScopeLabel(m, workspace.locations),
                m.state,
              ])}
            />
            {writable && <Action label="Add member" icon="+" disabled={busy} onPress={onAssign} />}
          </>
        }
      />
      <RecordCollection
        showExport={false}
        label="team members"
        onOpen={(id) => {
          const m = workspace.members.find((m) => m.accountId === id);
          if (m) onEdit(m);
        }}
        items={members.map((m) => ({
          id: m.accountId,
          title: m.email,
          subtitle: m.role,
          detail: memberScopeLabel(m, workspace.locations),
          status: m.state,
          tone: m.state === 'active' ? 'success' : m.state === 'suspended' ? 'warning' : 'neutral',
        }))}
        toolbar={
          <>
            <View style={{ flexGrow: 1, flexBasis: 160 }}>
              <SearchControl label="Search team members" value={search} onChange={setSearch} />
            </View>
            <FilterButton active={active} onPress={() => setOpen(true)} />
            <SidePanel title="Team filters" open={open} onClose={() => setOpen(false)}>
              <Choice
                label="Role"
                value={role}
                onChange={setRole}
                options={[
                  { value: '', label: 'All roles' },
                  ...['owner', 'manager', 'cashier', 'viewer', 'custom'].map((r) => ({
                    value: r,
                    label: r,
                  })),
                ]}
              />
              <Choice
                label="Status"
                value={status}
                onChange={setStatus}
                options={[
                  { value: '', label: 'All statuses' },
                  ...['active', 'suspended', 'archived'].map((r) => ({ value: r, label: r })),
                ]}
              />
            </SidePanel>
          </>
        }
      />
    </>
  );
}
