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

const functionsRegion = import.meta.env.VITE_FIREBASE_FUNCTIONS_REGION || "us-central1";
const functions = isPaystackEnabled ? getFunctions(firebaseApp, functionsRegion) : null;

if (isPaystackEnabled && functions) {
  console.log("[paystack] Firebase Functions initialized", { region: functionsRegion });
} else {
  console.log("[paystack] Firebase Functions not enabled; using local simulation");
}

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

/** Extracts a safe, structured diagnostic object from a Firebase callable error. */
export function diagnosticFromError(error: unknown, context: string) {
  if (error && typeof error === "object" && "code" in error && "message" in error) {
    const e = error as { code?: string; message?: string; details?: unknown };
    return {
      context,
      code: e.code || "unknown",
      message: e.message || String(error),
      details: e.details,
      isCallableError: true,
    };
  }
  return {
    context,
    code: "unknown",
    message: error instanceof Error ? error.message : String(error),
    details: undefined,
    isCallableError: false,
  };
}

export async function initializePaystack(orderId: string, callbackUrl: string): Promise<InitializeResponse> {
  console.log("[paystack] initializePaystack called", { orderId, callbackUrl });

  if (!isPaystackEnabled || !functions) {
    throw new Error("Paystack functions are not enabled for this environment.");
  }

  const call = httpsCallable<InitializePayload, InitializeResponse>(functions, "paystackInitialize");
  try {
    const result: HttpsCallableResult<InitializeResponse> = await call({ orderId, callbackUrl });
    console.log("[paystack] initializePaystack response", result.data);
    return result.data;
  } catch (error) {
    const diag = diagnosticFromError(error, "initializePaystack");
    console.error("[paystack] initializePaystack failed", diag);
    throw error;
  }
}

export async function verifyPaystack(reference: string): Promise<VerifyResponse> {
  console.log("[paystack] verifyPaystack called", { reference });

  if (!isPaystackEnabled || !functions) {
    throw new Error("Paystack functions are not enabled for this environment.");
  }

  const call = httpsCallable<VerifyPayload, VerifyResponse>(functions, "paystackVerify");
  try {
    const result: HttpsCallableResult<VerifyResponse> = await call({ reference });
    console.log("[paystack] verifyPaystack response", result.data);
    return result.data;
  } catch (error) {
    const diag = diagnosticFromError(error, "verifyPaystack");
    console.error("[paystack] verifyPaystack failed", diag);
    throw error;
  }
}
