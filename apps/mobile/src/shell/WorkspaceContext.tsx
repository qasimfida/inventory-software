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
import { authClient } from '../auth/client';
import { settingsModel } from '../settings/model';
function useWorkspaceModel() {
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
    const id = settingsModel.snapshot().accountId;
    if (id) void settingsModel.connect(id, state.selectedId);
  }, [state.selectedId]);
  return {
    model,
    state,
    selection: selectedIds,
    setSelection,
    selectionKey,
    warehouseIds,
    storeId,
    setStoreId,
    locked,
    setLocked,
    locations,
    business: state.businesses.find((b) => b.id === state.selectedId),
  };
}
const Context = createContext<ReturnType<typeof useWorkspaceModel> | null>(null);
export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const value = useWorkspaceModel();
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useWorkspace() {
  const value = useContext(Context);
  if (!value) throw new Error('Workspace provider required');
  return value;
}

export const useOptionalWorkspace = () => useContext(Context);
