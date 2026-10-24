import { createContext, useContext, useState, useMemo } from 'react';
import type { ReactNode, Dispatch, SetStateAction } from 'react';
type CartLink = { label: string; open: () => void };
const Context = createContext<{
  available: boolean;
  cart: CartLink | null;
  setCart: Dispatch<SetStateAction<CartLink | null>>;
}>({ available: false, cart: null, setCart: () => {} });
export function CartDockProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<CartLink | null>(null);
  const value = useMemo(() => ({ available: true, cart, setCart }), [cart]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export const useCartDock = () => useContext(Context);
