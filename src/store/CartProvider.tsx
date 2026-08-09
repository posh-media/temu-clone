import { createContext, useCallback, useContext, useMemo, type ReactNode } from "react";
import { useLocalStorage } from "../hooks/useLocalStorage";
import { useCatalogue } from "../hooks/useCatalogue";
import { clamp } from "../lib/utils";
import { useFlashSale } from "./FlashSaleProvider";
import type { CartLine, CartTotals, HydratedCartLine } from "../types/commerce";
import type { Product } from "../types/product";

/** Shipping rules, kept together so checkout and the cart never disagree. */
export const SHIPPING = { flatRate: 2500, freeThreshold: 30_000 } as const;
const MAX_QTY_PER_LINE = 99;

interface CartApi {
  /** Raw persisted lines (id + qty only). */
  lines: CartLine[];
  /** Lines joined with live product documents from the catalogue query. */
  items: HydratedCartLine[];
  totals: CartTotals;
  /** Total units in the cart, used for the header badge. */
  count: number;
  isHydrating: boolean;
  /** True when an active flash-sale restricts the cart to a single item. */
  flashSaleActive: boolean;
  add: (product: Product, qty?: number, variation?: string) => boolean;
  setQty: (productId: string, qty: number) => void;
  remove: (productId: string) => void;
  toggleSelected: (productId: string) => void;
  setAllSelected: (selected: boolean) => void;
  clearSelected: () => void;
  clear: () => void;
  qtyOf: (productId: string) => number;
}

const CartContext = createContext<CartApi | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useLocalStorage<CartLine[]>("temu-clone:cart", []);
  const { data: catalogue, isLoading } = useCatalogue();
  const flashSale = useFlashSale();

  const productsById = useMemo(() => {
    const map = new Map<string, Product>();
    catalogue?.forEach((p) => map.set(p.id, p));
    return map;
  }, [catalogue]);

  /**
   * Only the product id and quantity are persisted - prices, stock and images
   * always come from Firestore, so the cart can never show a stale price.
   * Lines whose product has disappeared from the catalogue are dropped.
   * When a flash sale is active, the promo product uses the promotional price
   * and the cart may only contain that product.
   */
  const items = useMemo<HydratedCartLine[]>(() => {
    if (!catalogue) return [];
    return lines.flatMap((line) => {
      const product = productsById.get(line.productId);
      if (!product) return [];
      const promoPrice = flashSale.getPromoPrice(product.id, product.price);
      const maxQty = flashSale.isPromoProduct(product.id) ? 1 : Math.max(1, Math.min(product.availableStock || MAX_QTY_PER_LINE, MAX_QTY_PER_LINE));
      const qty = clamp(line.qty, 1, maxQty);
      const unitPrice = promoPrice ?? product.price;
      return [{ ...line, qty, product, lineTotal: unitPrice * qty }];
    });
  }, [catalogue, lines, productsById, flashSale]);

  const totals = useMemo<CartTotals>(() => {
    const selected = items.filter((i) => i.selected);
    const subtotal = selected.reduce((sum, i) => sum + i.lineTotal, 0);
    const listSubtotal = selected.reduce((sum, i) => sum + (i.product.listPrice ?? i.product.price) * i.qty, 0);
    const shipping = subtotal === 0 || subtotal >= SHIPPING.freeThreshold ? 0 : SHIPPING.flatRate;
    return {
      itemCount: items.reduce((sum, i) => sum + i.qty, 0),
      selectedCount: selected.reduce((sum, i) => sum + i.qty, 0),
      subtotal,
      listSubtotal,
      savings: Math.max(0, listSubtotal - subtotal),
      shipping,
      total: subtotal + shipping,
      amountToFreeShipping: subtotal === 0 ? SHIPPING.freeThreshold : Math.max(0, SHIPPING.freeThreshold - subtotal),
    };
  }, [items]);

  const add = useCallback<CartApi["add"]>((product, qty = 1, variation) => {
    if (flashSale.isActive && !flashSale.isPromoProduct(product.id)) {
      return false;
    }

    const maxQty = flashSale.isPromoProduct(product.id) ? 1 : MAX_QTY_PER_LINE;

    setLines((current) => {
      const index = current.findIndex((l) => l.productId === product.id && l.variation === variation);
      if (index === -1) {
        return [...current, { productId: product.id, qty: clamp(qty, 1, maxQty), selected: true, variation, addedAt: Date.now() }];
      }
      const next = [...current];
      next[index] = { ...next[index], qty: clamp(flashSale.isPromoProduct(product.id) ? 1 : next[index].qty + qty, 1, maxQty), selected: true };
      return next;
    });
    return true;
  }, [setLines, flashSale]);

  const setQty = useCallback<CartApi["setQty"]>((productId, qty) => {
    const maxQty = flashSale.isPromoProduct(productId) ? 1 : MAX_QTY_PER_LINE;
    setLines((current) =>
      qty <= 0
        ? current.filter((l) => l.productId !== productId)
        : current.map((l) => (l.productId === productId ? { ...l, qty: clamp(qty, 1, maxQty) } : l)),
    );
  }, [setLines, flashSale]);

  const api = useMemo<CartApi>(
    () => ({
      lines,
      items,
      totals,
      count: lines.reduce((sum, l) => sum + l.qty, 0),
      isHydrating: isLoading,
      flashSaleActive: flashSale.isActive,
      add,
      setQty,
      remove: (productId) => setLines((c) => c.filter((l) => l.productId !== productId)),
      toggleSelected: (productId) =>
        setLines((c) => c.map((l) => (l.productId === productId ? { ...l, selected: !l.selected } : l))),
      setAllSelected: (selected) => setLines((c) => c.map((l) => ({ ...l, selected }))),
      clearSelected: () => setLines((c) => c.filter((l) => !l.selected)),
      clear: () => setLines([]),
      qtyOf: (productId) => lines.find((l) => l.productId === productId)?.qty ?? 0,
    }),
    [lines, items, totals, isLoading, flashSale.isActive, add, setQty, setLines],
  );

  return <CartContext.Provider value={api}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside <CartProvider>");
  return ctx;
}
