import { Banknote, CreditCard, Landmark, Smartphone, Wallet } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { PaymentMethodId } from "../types/commerce";

export interface PaymentMethodOption {
  id: PaymentMethodId;
  label: string;
  description: string;
  icon: LucideIcon;
  /** Normalized gateway channel (e.g. "card", "bank_transfer"). */
  orderValue: string;
}

export const PAYMENT_METHODS: PaymentMethodOption[] = [
  {
    id: "card",
    label: "Debit or credit card",
    description: "Visa, Mastercard and Verve",
    icon: CreditCard,
    orderValue: "card",
  },
  {
    id: "bank-transfer",
    label: "Bank transfer",
    description: "Pay from your bank app or via instant bank login",
    icon: Landmark,
    orderValue: "bank_transfer",
  },
  {
    id: "ussd",
    label: "USSD",
    description: "Dial a short code on your phone to authorise the payment",
    icon: Smartphone,
    orderValue: "ussd",
  },
  {
    id: "mobile-money",
    label: "Mobile money",
    description: "Pay with your mobile money wallet",
    icon: Wallet,
    orderValue: "mobile_money",
  },
  {
    id: "pay-on-delivery",
    label: "Pay on delivery",
    description: "Pay with cash or card when your parcel arrives",
    icon: Banknote,
    orderValue: "pay_on_delivery",
  },
];

const ALL_METHOD_IDS = PAYMENT_METHODS.map((method) => method.id);

export const paymentMethod = (id: PaymentMethodId) =>
  PAYMENT_METHODS.find((method) => method.id === id) ?? PAYMENT_METHODS[0];

/**
 * Parses `VITE_PAYMENT_METHODS` (a JSON string) into the list of payment
 * methods that should be shown at checkout/payment.
 *
 * Example: `VITE_PAYMENT_METHODS=["card","bank_transfer"]` -> ["card", "bank-transfer"]
 *
 * Unknown values are ignored. If the variable is missing or invalid, all
 * supported methods are returned so the checkout never crashes.
 */
export function getEnabledPaymentMethods(): PaymentMethodId[] {
  const raw = import.meta.env.VITE_PAYMENT_METHODS;
  if (typeof raw !== "string" || !raw.trim()) {
    return [...ALL_METHOD_IDS];
  }

  try {
    const parsed = JSON.parse(raw.trim());
    if (!Array.isArray(parsed)) {
      return [...ALL_METHOD_IDS];
    }

    const valid = new Set<PaymentMethodId>(ALL_METHOD_IDS as PaymentMethodId[]);
    const filtered = parsed
      .map((value: unknown) => {
        if (typeof value !== "string") return null;
        const normalized = value.trim().replace(/_/g, "-");
        if (!valid.has(normalized as PaymentMethodId)) return null;
        return normalized as PaymentMethodId;
      })
      .filter((id): id is PaymentMethodId => id !== null);

    if (filtered.length === 0) {
      return [...ALL_METHOD_IDS];
    }

    return [...new Set(filtered)];
  } catch {
    return [...ALL_METHOD_IDS];
  }
}
