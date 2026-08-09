import { createContext, useContext, useMemo, type ReactNode } from "react";
import { useLocalStorage } from "../hooks/useLocalStorage";
import { FLASH_SALE_DURATION_MS, isFlashSaleExpired, parseFlashSalePriceBest } from "../lib/flashSale";
import type { Product } from "../types/product";

export type FlashSaleStatus = "inactive" | "available" | "claimed" | "expired" | "completed" | "abandoned";

export interface FlashSaleSession {
  productId: string;
  productName: string;
  image: string;
  tag: string;
  originalPrice: number;
  promoPrice: number;
  startedAt: number;
  expiresAt: number;
  quantity: 1;
  /** True once the user has left the product page for checkout. */
  checkoutStarted: boolean;
  /** True once an order has been placed. */
  completed: boolean;
  status: FlashSaleStatus;
}

export interface FlashSaleApi {
  session: FlashSaleSession | null;
  status: FlashSaleStatus;
  isActive: boolean;
  canClaim: (product: Product) => FlashSaleSession | null;
  claim: (product: Product) => FlashSaleSession | null;
  markCheckoutStarted: () => void;
  markCompleted: () => void;
  clear: () => void;
  isPromoProduct: (productId: string) => boolean;
  getPromoPrice: (productId: string, fallback: number) => number;
}

const FlashSaleContext = createContext<FlashSaleApi | null>(null);

function buildSession(product: Product): FlashSaleSession | null {
  const offer = parseFlashSalePriceBest(product.promotionalTags, product.price);
  if (!offer) return null;

  const now = Date.now();
  return {
    productId: product.id,
    productName: product.name,
    image: product.images[0] ?? "",
    tag: offer.tag,
    originalPrice: offer.originalPrice,
    promoPrice: offer.price,
    startedAt: now,
    expiresAt: now + FLASH_SALE_DURATION_MS,
    quantity: 1,
    checkoutStarted: false,
    completed: false,
    status: "claimed",
  };
}

export function FlashSaleProvider({ children }: { children: ReactNode }) {
  const [raw, setRaw] = useLocalStorage<FlashSaleSession | null>("temu-clone:flash-sale", null);

  const session: FlashSaleSession | null = useMemo(() => {
    if (!raw) return null;
    if (raw.status === "completed" || raw.status === "abandoned") return null;
    if (isFlashSaleExpired(raw.expiresAt)) {
      return { ...raw, status: "expired" };
    }
    return raw;
  }, [raw]);

  const api = useMemo<FlashSaleApi>(() => {
    const isActive = session !== null && !session.completed && !isFlashSaleExpired(session.expiresAt);

    return {
      session,
      status: session?.status ?? "inactive",
      isActive,
      canClaim: (product) => {
        const offer = parseFlashSalePriceBest(product.promotionalTags, product.price);
        if (!offer || isFlashSaleExpired(session?.expiresAt ?? 0)) return null;
        return buildSession(product);
      },
      claim: (product) => {
        const next = buildSession(product);
        if (!next) return null;
        setRaw(next);
        return next;
      },
      markCheckoutStarted: () => {
        if (session && !session.completed && !isFlashSaleExpired(session.expiresAt)) {
          setRaw({ ...session, checkoutStarted: true, status: "claimed" });
        }
      },
      markCompleted: () => {
        if (session) {
          setRaw({ ...session, completed: true, status: "completed" });
        }
      },
      clear: () => setRaw(null),
      isPromoProduct: (productId) => isActive && session?.productId === productId,
      getPromoPrice: (productId, fallback) =>
        isActive && session?.productId === productId ? session.promoPrice : fallback,
    };
  }, [session, setRaw]);

  return <FlashSaleContext.Provider value={api}>{children}</FlashSaleContext.Provider>;
}

export function useFlashSale() {
  const ctx = useContext(FlashSaleContext);
  if (!ctx) throw new Error("useFlashSale must be used inside <FlashSaleProvider>");
  return ctx;
}
