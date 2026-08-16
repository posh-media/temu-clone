import { markOrderPaid } from "./orders";
import { initializeKorapay, verifyKorapay, type VerifyResponse as KorapayVerifyResponse } from "./korapay";
import { initializePaystack, verifyPaystack, type VerifyResponse as PaystackVerifyResponse } from "./paystack";
import type { PaymentMethodId, PaymentStatus } from "../types/commerce";

export type PaymentProviderId = "paystack" | "korapay";

export interface PaymentProviderInfo {
  id: PaymentProviderId;
  label: string;
  icon?: string;
}

export const PAYMENT_PROVIDERS: PaymentProviderInfo[] = [
  { id: "paystack", label: "Paystack" },
  { id: "korapay", label: "KoraPay" },
];

/**
 * Returns true when Paystack is enabled. Defaults to enabled to preserve the
 * existing behaviour when the new toggle is unset.
 */
export function isPaystackEnabled(): boolean {
  const v = import.meta.env.VITE_ENABLE_PAYSTACK_PAYMENT;
  if (v === "true") return true;
  if (v === "false") return false;
  // Legacy fallback for the previous flag.
  return (
    import.meta.env.VITE_PAYSTACK_ENABLED === "true" ||
    (import.meta.env.VITE_PAYSTACK_ENABLED !== "false" && import.meta.env.PROD)
  );
}

/** KoraPay is opt-in and disabled unless explicitly enabled. */
export function isKorapayEnabled(): boolean {
  return import.meta.env.VITE_ENABLE_KORAPAY_PAYMENT === "true";
}

export function availablePaymentProviders(): PaymentProviderInfo[] {
  const list: PaymentProviderInfo[] = [];
  if (isPaystackEnabled()) list.push(PAYMENT_PROVIDERS[0]);
  if (isKorapayEnabled()) list.push(PAYMENT_PROVIDERS[1]);
  return list;
}

export function defaultPaymentProviderId(): PaymentProviderId | null {
  return availablePaymentProviders()[0]?.id ?? null;
}

/**
 * Returns true when the selected gateway supports the selected UI method.
 * Pay-on-delivery is handled locally and is always available.
 */
export function providerSupportsMethod(
  provider: PaymentProviderId | null,
  method: PaymentMethodId,
): boolean {
  if (method === "pay-on-delivery") return true;
  if (!provider) return false;
  const paystack = new Set<PaymentMethodId>(["card", "bank-transfer", "ussd", "mobile-money"]);
  const korapay = new Set<PaymentMethodId>(["card", "bank-transfer", "mobile-money"]);
  const supported = provider === "paystack" ? paystack : korapay;
  return supported.has(method);
}

export interface InitializeResponse {
  ok: true;
  authorizationUrl?: string;
  accessCode?: string;
  checkoutUrl?: string;
  reference: string;
  orderId: string;
}

export async function initializePayment(
  provider: PaymentProviderId,
  orderId: string,
  callbackUrl: string,
): Promise<InitializeResponse> {
  if (provider === "paystack") {
    const result = await initializePaystack(orderId, callbackUrl);
    return { ...result, checkoutUrl: undefined };
  }

  const result = await initializeKorapay(orderId, callbackUrl);
  return { ...result, authorizationUrl: undefined, accessCode: undefined };
}

export type VerifyResponse = PaystackVerifyResponse | KorapayVerifyResponse;

export async function verifyPayment(provider: PaymentProviderId, reference: string): Promise<VerifyResponse> {
  return provider === "paystack" ? verifyPaystack(reference) : verifyKorapay(reference);
}

export interface PaymentRequest {
  reference: string;
  amount: number;
  method: PaymentMethodId;
  email: string;
}

export interface PaymentResult {
  status: PaymentStatus;
  message: string;
}

const wait = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));

class LocalPaymentProvider {
  readonly name = "local-simulation";

  async authorize({ reference, method }: PaymentRequest): Promise<PaymentResult> {
    await wait(1200);

    if (method === "pay-on-delivery") {
      await markOrderPaid(reference, "pending");
      return { status: "pending", message: "Your order is confirmed. Pay the courier on delivery." };
    }

    // Fallback when no online provider is configured for the current environment.
    await markOrderPaid(reference, "paid");
    return { status: "paid", message: "Payment authorised (local test mode)." };
  }
}

/** Used for pay-on-delivery and as a fallback when no gateway is configured. */
export const paymentProvider = new LocalPaymentProvider();
