import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from 'react';
import type { ReactNode } from 'react';
import {
  createOrganizationClient,
  OrganizationModel,
  selectedLocations,
} from '@inventory/api-client';
import type { OrganizationView } from '@inventory/api-client';
import type { Location, Business } from '@inventory/contracts';
import { authClient } from '@/platform/auth-client';
import { settingsModel } from '@/platform/settings';
const Context = createContext<{
  model: OrganizationModel;
  state: OrganizationView;
  business: Business | undefined;
  storeId: string;
  selection: string[];
  setSelection: (ids: string[]) => void;
  selectionKey: string;
  warehouseIds: string[];
  setStoreId: (id: string) => void;
  locked: boolean;
  setLocked: (locked: boolean) => void;
  locations: Location[];
} | null>(null);
export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const model = useMemo(
    () => new OrganizationModel(createOrganizationClient(authClient.organizationRequest)),
    [],
  );
  const state = useSyncExternalStore(model.subscribe, model.snapshot);
  const [selection, updateSelection] = useState<{ businessId: string | null; ids: string[] }>({
      businessId: null,
      ids: [],
    }),
    [locked, setLocked] = useState(false);
  const selectedIds = selection.businessId === state.selectedId ? selection.ids : [];
  const all = state.workspace?.locations ?? [];
  const locations = selectedLocations(all, selectedIds);
  const warehouseIds = locations
    .filter((l) => l.kind === 'warehouses' && l.state === 'active')
    .map((l) => l.id);
  const storeId =
    selectedIds.length === 1 && all.some((l) => l.id === selectedIds[0] && l.kind === 'stores')
      ? selectedIds[0]!
      : '';
  const selectionKey = selectedIds.join(',');
  const setSelection = (ids: string[]) => {
    if (!locked) updateSelection({ businessId: state.selectedId, ids });
  };
  const setStoreId = (id: string) => setSelection(id ? [id] : []);

  useEffect(() => {
    void model.refresh();
    const timer = setInterval(() => void model.revalidate(), 60000);
    return () => {
      clearInterval(timer);
      model.reset();
    };
  }, [model]);
  useEffect(() => {
    const account = settingsModel.snapshot().accountId;
    if (account) void settingsModel.connect(account, state.selectedId);
  }, [state.selectedId]);
  const business = state.businesses.find((b) => b.id === state.selectedId);
  return (
    <Context.Provider
      value={{
        model,
        state,
        business,
        storeId,
        setStoreId,
        locked,
        setLocked,
        locations,
        selection: selectedIds,
        setSelection,
        selectionKey,
        warehouseIds,
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function useWorkspace() {
  const value = useContext(Context);
  if (!value) throw new Error('WorkspaceProvider is required');
  return value;
}

export const useOptionalWorkspace = () => useContext(Context);
