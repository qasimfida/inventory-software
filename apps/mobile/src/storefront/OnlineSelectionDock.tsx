import { createContext, useContext, useMemo, useState } from 'react';
import type { Dispatch, SetStateAction, ReactNode } from 'react';
type SelectionLink = { count: number; open: () => void };
const Context = createContext<{
  selection: SelectionLink | null;
  setSelection: Dispatch<SetStateAction<SelectionLink | null>>;
}>({ selection: null, setSelection: () => {} });
/** Feature-owned dock keeps online bulk actions reachable outside the shell scroll view. */
export function OnlineSelectionDockProvider({ children }: { children: ReactNode }) {
  const [selection, setSelection] = useState<SelectionLink | null>(null);
  const value = useMemo(() => ({ selection, setSelection }), [selection]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export const useOnlineSelectionDock = () => useContext(Context);
