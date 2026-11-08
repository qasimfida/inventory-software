import { ScreenHeader } from '@/components/common/ScreenHeader';
import { ExportRecords } from '@/components/common/ExportRecords';
import { memberScopeLabel } from '@inventory/api-client';
import { useState } from 'react';
import { hasPermission } from '@inventory/contracts';
import type { Membership, Workspace } from '@inventory/contracts';
import { RecordCollection } from '@/components/common/RecordCollection';
import { SearchControl } from '@/components/common/SearchControl';
import { FilterButton } from '@/components/common/FilterButton';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/Popover';
import { Select } from '@/components/ui/FormControls';
import { Button } from '@/components/ui/Button';
import { Plus } from 'lucide-react';
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
            {writable && (
              <Button disabled={busy} onClick={onAssign}>
                <Plus aria-hidden="true" />
                Add member
              </Button>
            )}
          </>
        }
      />
      <RecordCollection
        showExport={false}
        label="team members"
        columns={['Member', 'Role', 'Access scope']}
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
            <div className="collection-search">
              <SearchControl label="Search team members" value={search} onChange={setSearch} />
            </div>
            <Popover>
              <PopoverTrigger asChild>
                <FilterButton active={active} />
              </PopoverTrigger>
              <PopoverContent className="space-y-3">
                <label>
                  Role
                  <Select value={role} onChange={(e) => setRole(e.target.value)}>
                    <option value="">All roles</option>
                    {['owner', 'manager', 'cashier', 'viewer', 'custom'].map((r) => (
                      <option key={r}>{r}</option>
                    ))}
                  </Select>
                </label>
                <label>
                  Status
                  <Select value={status} onChange={(e) => setStatus(e.target.value)}>
                    <option value="">All statuses</option>
                    {['active', 'suspended', 'archived'].map((r) => (
                      <option key={r}>{r}</option>
                    ))}
                  </Select>
                </label>
              </PopoverContent>
            </Popover>
          </>
        }
      />
    </>
  );
}
