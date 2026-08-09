import { markOrderPaid } from "./orders";
import { initializePaystack, verifyPaystack, type VerifyResponse } from "./paystack";
import type { PaymentMethodId, PaymentStatus } from "../types/commerce";

/**
 * Payment provider seam.
 *
 * - Pay-on-delivery is simulated locally because the courier collects payment.
 * - Card, bank transfer and USSD are routed through Paystack. The frontend
 *   calls `initializePaystack`, redirects to Paystack, then calls `verifyPaystack`
 *   on return.
 */

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

export interface PaymentProvider {
  readonly name: string;
  authorize: (request: PaymentRequest) => Promise<PaymentResult>;
}

const wait = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));

class LocalPaymentProvider implements PaymentProvider {
  readonly name = "local-simulation";

  async authorize({ reference, method }: PaymentRequest): Promise<PaymentResult> {
    await wait(1200);

    // Pay-on-delivery is authorised later, by the courier.
    if (method === "pay-on-delivery") {
      await markOrderPaid(reference, "pending");
      return { status: "pending", message: "Your order is confirmed. Pay the courier on delivery." };
    }

    // Fallback when Paystack is not reachable in development / test.
    await markOrderPaid(reference, "paid");
    return { status: "paid", message: "Payment authorised (local test mode)." };
  }
}

/** Re-export Paystack helpers so components can drive the redirect/verify flow. */
export { initializePaystack, verifyPaystack, type VerifyResponse };

export const paymentProvider: PaymentProvider = new LocalPaymentProvider();
