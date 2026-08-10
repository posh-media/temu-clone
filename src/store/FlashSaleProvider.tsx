import { createContext, useContext, useEffect, useMemo, type ReactNode } from "react";
import { useLocalStorage } from "../hooks/useLocalStorage";
import { getFlashSaleConfig, getFlashSaleDurationMs, isFlashSaleExpired, parseFlashSalePriceBest } from "../lib/flashSale";
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
    expiresAt: now + getFlashSaleDurationMs(),
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
    if (isFlashSaleExpired(raw.expiresAt) && raw.status !== "expired") {
      return { ...raw, status: "expired" };
    }
    return raw;
  }, [raw]);

  // When the timer expires, either restart the countdown or mark it expired.
  // A setTimeout is used so the transition happens exactly at expiration even
  // if no component re-renders.
  useEffect(() => {
    if (!raw || raw.status === "completed" || raw.status === "abandoned" || raw.status === "expired") return;
    if (isFlashSaleExpired(raw.expiresAt)) {
      const { durationMs, restartOnTimeout } = getFlashSaleConfig();
      if (restartOnTimeout) {
        const now = Date.now();
        setRaw({ ...raw, startedAt: now, expiresAt: now + durationMs, status: "claimed" });
      } else {
        setRaw({ ...raw, status: "expired" });
      }
      return;
    }

    const remaining = raw.expiresAt - Date.now();
    const id = window.setTimeout(() => {
      const { durationMs, restartOnTimeout } = getFlashSaleConfig();
      if (restartOnTimeout) {
        const now = Date.now();
        setRaw({ ...raw, startedAt: now, expiresAt: now + durationMs, status: "claimed" });
      } else {
        setRaw({ ...raw, status: "expired" });
      }
    }, remaining);

    return () => window.clearTimeout(id);
  }, [raw, setRaw]);

  const api = useMemo<FlashSaleApi>(() => {
    const isActive = session !== null && !session.completed && !isFlashSaleExpired(session.expiresAt);

    return {
      session,
      status: session?.status ?? "inactive",
      isActive,
      canClaim: (product) => {
        const offer = parseFlashSalePriceBest(product.promotionalTags, product.price);
        if (!offer) return null;
        if (!session) return buildSession(product);
        if (isFlashSaleExpired(session.expiresAt)) {
          return getFlashSaleConfig().restartOnTimeout ? buildSession(product) : null;
        }
        if (session.productId !== product.id) return null;
        return buildSession(product);
      },
      claim: (product) => {
        if (session?.status === "expired" && !getFlashSaleConfig().restartOnTimeout) return null;
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
