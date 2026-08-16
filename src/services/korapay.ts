import { getFunctions, httpsCallable, type HttpsCallableResult } from "firebase/functions";
import { firebaseApp } from "../lib/firebase";

export const isKorapayEnabled =
  import.meta.env.VITE_ENABLE_KORAPAY_PAYMENT === "true";

const functionsRegion = import.meta.env.VITE_FIREBASE_FUNCTIONS_REGION || "us-central1";
const functions = isKorapayEnabled ? getFunctions(firebaseApp, functionsRegion) : null;

export interface InitializePayload {
  orderId: string;
  callbackUrl: string;
}

export interface InitializeResponse {
  ok: true;
  checkoutUrl: string;
  reference: string;
  orderId: string;
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

export async function initializeKorapay(orderId: string, callbackUrl: string): Promise<InitializeResponse> {
  if (!isKorapayEnabled || !functions) {
    throw new Error("KoraPay functions are not enabled for this environment.");
  }

  const call = httpsCallable<InitializePayload, InitializeResponse>(functions, "korapayInitialize");
  const result: HttpsCallableResult<InitializeResponse> = await call({ orderId, callbackUrl });
  return result.data;
}

export async function verifyKorapay(reference: string): Promise<VerifyResponse> {
  if (!isKorapayEnabled || !functions) {
    throw new Error("KoraPay functions are not enabled for this environment.");
  }

  const call = httpsCallable<VerifyPayload, VerifyResponse>(functions, "korapayVerify");
  const result: HttpsCallableResult<VerifyResponse> = await call({ reference });
  return result.data;
}
