import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';

export interface CartLine {
  variantId: string;
  slug: string;
  name: string;
  variantLabel: string;
  image?: string;
  unitPriceCents: number;
  quantity: number;
}

interface CartCtx {
  lines: CartLine[];
  count: number;
  subtotalCents: number;
  open: boolean;
  setOpen(o: boolean): void;
  add(line: Omit<CartLine, 'quantity'>, qty?: number): void;
  setQty(variantId: string, qty: number): void;
  remove(variantId: string): void;
  clear(): void;
}

const KEY = 'lw_cart_v2';
const MAX = 10;
const Ctx = createContext<CartCtx>(null as any);
export const useCart = () => useContext(Ctx);

function load(): CartLine[] {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || '[]');
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>(load);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(lines));
    } catch {
      /* storage unavailable */
    }
  }, [lines]);

  const add = useCallback((line: Omit<CartLine, 'quantity'>, qty = 1) => {
    setLines((cur) => {
      const found = cur.find((l) => l.variantId === line.variantId);
      if (found) return cur.map((l) => (l.variantId === line.variantId ? { ...l, ...line, quantity: Math.min(l.quantity + qty, MAX) } : l));
      return [...cur, { ...line, quantity: Math.min(qty, MAX) }];
    });
    setOpen(true);
  }, []);
  const setQty = useCallback(
    (id: string, qty: number) => setLines((cur) => cur.map((l) => (l.variantId === id ? { ...l, quantity: Math.max(1, Math.min(qty, MAX)) } : l))),
    [],
  );
  const remove = useCallback((id: string) => setLines((cur) => cur.filter((l) => l.variantId !== id)), []);
  const clear = useCallback(() => setLines([]), []);

  const value = useMemo(
    () => ({
      lines,
      count: lines.reduce((n, l) => n + l.quantity, 0),
      subtotalCents: lines.reduce((n, l) => n + l.quantity * l.unitPriceCents, 0),
      open,
      setOpen,
      add,
      setQty,
      remove,
      clear,
    }),
    [lines, open, add, setQty, remove, clear],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
