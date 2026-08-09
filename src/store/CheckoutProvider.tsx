import { createContext, useContext, useMemo, type ReactNode } from "react";
import { useLocalStorage } from "../hooks/useLocalStorage";
import type { CheckoutDraft, PaymentMethodId } from "../types/commerce";

interface CheckoutApi {
  draft: CheckoutDraft;
  setAddressId: (addressId: string) => void;
  setPaymentMethod: (method: PaymentMethodId) => void;
  setNote: (note: string) => void;
  setOrderReference: (reference: string | undefined) => void;
  reset: () => void;
}

const EMPTY_DRAFT: CheckoutDraft = { paymentMethod: "card", note: "" };
const CheckoutContext = createContext<CheckoutApi | null>(null);

/**
 * Holds the in-progress checkout (chosen address, payment method, note and the
 * reference of the order just created) so /checkout and /payment share state
 * across a page refresh.
 */
export function CheckoutProvider({ children }: { children: ReactNode }) {
  const [draft, setDraft, reset] = useLocalStorage<CheckoutDraft>("temu-clone:checkout", EMPTY_DRAFT);

  const api = useMemo<CheckoutApi>(
    () => ({
      draft,
      setAddressId: (addressId) => setDraft((d) => ({ ...d, addressId })),
      setPaymentMethod: (paymentMethod) => setDraft((d) => ({ ...d, paymentMethod })),
      setNote: (note) => setDraft((d) => ({ ...d, note })),
      setOrderReference: (orderReference) => setDraft((d) => ({ ...d, orderReference })),
      reset,
    }),
    [draft, setDraft, reset],
  );

  return <CheckoutContext.Provider value={api}>{children}</CheckoutContext.Provider>;
}

export function useCheckout() {
  const ctx = useContext(CheckoutContext);
  if (!ctx) throw new Error("useCheckout must be used inside <CheckoutProvider>");
  return ctx;
}
