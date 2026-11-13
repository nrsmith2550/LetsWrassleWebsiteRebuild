import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';

export interface CartLine {
  variantId: number;
  productId: number;
  slug: string;
  name: string;
  variantLabel: string;
  image?: string;
  unitPriceCents: number;
  quantity: number;
  maxQty: number;
}

interface CartCtx {
  lines: CartLine[];
  count: number;
  subtotalCents: number;
  open: boolean;
  setOpen(o: boolean): void;
  add(line: Omit<CartLine, 'quantity'>, qty?: number): void;
  setQty(variantId: number, qty: number): void;
  remove(variantId: number): void;
  clear(): void;
}

const KEY = 'lw_cart_v1';
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
      if (found) {
        return cur.map((l) =>
          l.variantId === line.variantId ? { ...l, ...line, quantity: Math.min(l.quantity + qty, line.maxQty) } : l,
        );
      }
      return [...cur, { ...line, quantity: Math.min(qty, line.maxQty) }];
    });
    setOpen(true);
  }, []);

  const setQty = useCallback((variantId: number, qty: number) => {
    setLines((cur) =>
      cur.map((l) => (l.variantId === variantId ? { ...l, quantity: Math.max(1, Math.min(qty, l.maxQty)) } : l)),
    );
  }, []);
  const remove = useCallback((variantId: number) => setLines((cur) => cur.filter((l) => l.variantId !== variantId)), []);
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
