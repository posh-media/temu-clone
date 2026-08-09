import { getFunctions, httpsCallable, type HttpsCallableResult } from "firebase/functions";
import { firebaseApp } from "../lib/firebase";

/**
 * Paystack Cloud Functions are configured as an opt-in feature.
 * - In production builds the functions are invoked by default.
 * - In development, set `VITE_PAYSTACK_ENABLED=true` in `.env.local` to call
 *   the real Cloud Functions, otherwise the frontend falls back to local
 *   simulation. This keeps local smoke tests and dev servers from failing when
 *   the functions are not yet deployed.
 */
export const isPaystackEnabled =
  import.meta.env.VITE_PAYSTACK_ENABLED === "true" ||
  (import.meta.env.VITE_PAYSTACK_ENABLED !== "false" && import.meta.env.PROD);

const functions = isPaystackEnabled ? getFunctions(firebaseApp, "us-central1") : null;

export interface InitializePayload {
  orderId: string;
  callbackUrl: string;
}

export interface InitializeResponse {
  ok: true;
  authorizationUrl: string;
  accessCode: string;
  reference: string;
  orderId: string;
  paymentId: string;
}

export interface VerifyPayload {
  reference: string;
}

export interface VerifyResponse {
  ok: true;
  status: "paid" | "failed" | "pending";
  message: string;
  reference: string;
  orderId?: string;
  amount?: number;
  currency?: string;
  alreadyPaid?: boolean;
}

export async function initializePaystack(orderId: string, callbackUrl: string): Promise<InitializeResponse> {
  if (!isPaystackEnabled || !functions) {
    throw new Error("Paystack functions are not enabled for this environment.");
  }
  const call = httpsCallable<InitializePayload, InitializeResponse>(functions, "paystackInitialize");
  const result: HttpsCallableResult<InitializeResponse> = await call({ orderId, callbackUrl });
  return result.data;
}

export async function verifyPaystack(reference: string): Promise<VerifyResponse> {
  if (!isPaystackEnabled || !functions) {
    throw new Error("Paystack functions are not enabled for this environment.");
  }
  const call = httpsCallable<VerifyPayload, VerifyResponse>(functions, "paystackVerify");
  const result: HttpsCallableResult<VerifyResponse> = await call({ reference });
  return result.data;
}
